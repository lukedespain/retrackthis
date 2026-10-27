#include "JobPoster.h"

namespace
{
    struct Http
    {
        int status = 0;
        juce::var json;
    };

    // inAddress keeps a URL's query (like a signed upload's ?token=) in the address.
    // inPostData would move it into the body, and the upload would be refused.
    Http send (const juce::URL& url, const juce::String& method, const juce::String& headers, int timeoutMs)
    {
        Http res;
        if (auto stream = url.createInputStream (juce::URL::InputStreamOptions (juce::URL::ParameterHandling::inAddress)
                                                     .withHttpRequestCmd (method)
                                                     .withExtraHeaders (headers)
                                                     .withConnectionTimeoutMs (timeoutMs)
                                                     .withStatusCode (&res.status)))
            res.json = juce::JSON::parse (stream->readEntireStreamAsString());
        return res;
    }

    Http postJson (const juce::String& url, const juce::var& body, const juce::String& token)
    {
        return send (juce::URL (url).withPOSTData (juce::JSON::toString (body, true)), "POST",
                     "Content-Type: application/json\r\nAuthorization: Bearer " + token, 30000);
    }

    juce::String deadlineIso (int days)
    {
        return (juce::Time::getCurrentTime() + juce::RelativeTime::days (days)).toISO8601 (true);
    }
}

void JobPoster::start (Request r, std::function<void (const juce::String&)> progressFn,
                       std::function<void (const Result&)> doneFn)
{
    if (isThreadRunning())
        return;
    request = std::move (r);
    onProgress = std::move (progressFn);
    onDone = std::move (doneFn);
    startThread();
}

void JobPoster::progress (const juce::String& text)
{
    auto fn = onProgress;
    juce::MessageManager::callAsync ([fn, text] { if (fn) fn (text); });
}

juce::String JobPoster::upload (const juce::File& file, const juce::String& kind, Result& result)
{
    juce::DynamicObject::Ptr body = new juce::DynamicObject();
    body->setProperty ("fileName", file.getFileName());
    body->setProperty ("kind", kind);
    auto sign = postJson (request.baseUrl + "/api/uploads/sign", juce::var (body.get()), request.token);
    if (sign.status == 401)
    {
        result.signedOut = true;
        result.error = "You've been signed out. Sign in again, then post.";
        return {};
    }
    auto signedUrl = sign.json["signedUrl"].toString();
    auto publicUrl = sign.json["publicUrl"].toString();
    if (sign.status != 200 || signedUrl.isEmpty() || publicUrl.isEmpty())
    {
        result.error = sign.status == 0 ? "Can't reach RetrackThis. Check your connection and try again."
                                        : "Couldn't start the upload. Try again in a moment.";
        return {};
    }

    juce::MemoryBlock data;
    if (! file.loadFileAsData (data))
    {
        result.error = "Couldn't read the captured audio. Recapture and try again.";
        return {};
    }

    auto put = send (juce::URL (signedUrl).withPOSTData (data), "PUT", "Content-Type: audio/wav", 120000);
    if (put.status < 200 || put.status >= 300)
    {
        result.error = put.status == 0 ? "The upload was interrupted. Check your connection and try again."
                                       : "The upload didn't go through. Try again in a moment.";
        return {};
    }
    return publicUrl;
}

void JobPoster::run()
{
    Result result;
    result.isTest = request.isTest;
    const int n = request.jobs.size();
    const int seconds = juce::roundToInt (request.seconds);

    juce::Array<juce::var> parts;
    for (int i = 0; i < n && ! threadShouldExit(); ++i)
    {
        auto& job = request.jobs.getReference (i);
        progress ("Uploading " + job.trackName + " (" + juce::String (i + 1) + " of " + juce::String (n) + ")");
        auto partUrl = upload (job.partFile, "demo", result);
        if (partUrl.isEmpty()) break;
        auto bedUrl = upload (job.bedFile, "demo-backing", result);
        if (bedUrl.isEmpty()) break;

        juce::DynamicObject::Ptr part = new juce::DynamicObject();
        part->setProperty ("instrumentId", job.instrumentId);
        part->setProperty ("instrument", job.instrumentLabel);
        part->setProperty ("description", job.notes);
        part->setProperty ("demoFileUrl", partUrl);
        part->setProperty ("backingFileUrl", bedUrl);
        part->setProperty ("priceCents", job.priceUsd * 100);
        part->setProperty ("durationSeconds", seconds);
        part->setProperty ("deadline", deadlineIso (job.dueDays));
        parts.add (juce::var (part.get()));
    }

    if (result.error.isEmpty() && ! threadShouldExit())
    {
        progress (n > 1 ? "Posting your " + juce::String (n) + " jobs" : juce::String ("Posting your job"));

        juce::DynamicObject::Ptr body;
        if (n == 1)
            body = parts[0].getDynamicObject(); // one job: the same fields, at the top level
        else
        {
            body = new juce::DynamicObject();
            body->setProperty ("parts", parts);
        }
        body->setProperty ("title", request.title);
        body->setProperty ("postedFrom", request.postedFrom);
        if (request.musicalKey.isNotEmpty())
            body->setProperty ("musicalKey", request.musicalKey);
        if (request.bpm > 0)
            body->setProperty ("bpm", juce::roundToInt (request.bpm));
        if (request.isTest)
            body->setProperty ("isTest", true);

        auto res = postJson (request.baseUrl + "/api/jobs", juce::var (body.get()), request.token);
        if (res.status == 201 || res.status == 200)
        {
            result.ok = true;
            result.firstJobId = res.json["id"].toString();
        }
        else if (res.status == 401)
        {
            result.signedOut = true;
            result.error = "You've been signed out. Sign in again, then post.";
        }
        else
        {
            auto message = res.json["error"].toString();
            result.error = message.isNotEmpty() ? message
                         : res.status == 0 ? juce::String ("Can't reach RetrackThis. Check your connection and try again.")
                                           : juce::String ("Couldn't post the jobs. Try again in a moment.");
        }
    }

    auto fn = onDone;
    juce::MessageManager::callAsync ([fn, result] { if (fn) fn (result); });
}
