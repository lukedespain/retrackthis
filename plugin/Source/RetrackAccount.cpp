#include "RetrackAccount.h"
#include <sys/stat.h>

#ifndef RT_BASE_URL
 #define RT_BASE_URL "https://retrackthis.com"
#endif

namespace
{
    constexpr int fileCheckMs = 1500;

    RetrackAccount::State errorState (const juce::String& title, const juce::String& detail)
    {
        RetrackAccount::State s;
        s.phase = RetrackAccount::State::Phase::error;
        s.errorTitle = title;
        s.errorDetail = detail;
        return s;
    }

    RetrackAccount::State offlineState()
    {
        return errorState ("Can't reach RetrackThis",
                           "Check your internet connection, then try again.");
    }
}

RetrackAccount::RetrackAccount()
{
    loadFromFile (true);
    startTimer (fileCheckMs);
}

RetrackAccount::~RetrackAccount()
{
    stopTimer();
    pool.removeAllJobs (true, 4000);
}

juce::String RetrackAccount::baseUrl()
{
    return RT_BASE_URL;
}

juce::String RetrackAccount::hostName()
{
    juce::PluginHostType host;
    if (host.isLogic())          return "Logic Pro";
    if (host.isGarageBand())     return "GarageBand";
    if (host.isAbletonLive())    return "Ableton Live";
    if (host.isProTools())       return "Pro Tools";
    if (host.isCubase())         return "Cubase";
    if (host.isStudioOne())      return "Studio One";
    if (host.isReaper())         return "REAPER";
    if (host.isFruityLoops())    return "FL Studio";
    if (host.isBitwigStudio())   return "Bitwig Studio";
    return "your DAW";
}

//==============================================================================
void RetrackAccount::startSignIn (const juce::String& clientName)
{
    auto gen = ++generation;
    State s;
    s.phase = State::Phase::starting;
    setState (s);

    juce::DynamicObject::Ptr body = new juce::DynamicObject();
    body->setProperty ("clientName", clientName);
    juce::var bodyVar (body.get());

    juce::WeakReference<RetrackAccount> weak (this);
    runInBackground ([weak, gen, bodyVar]
    {
        auto res = request ("/api/plugin/auth/start", bodyVar, {});
        juce::MessageManager::callAsync ([weak, gen, res]
        {
            auto* self = weak.get();
            if (self == nullptr || gen != self->generation)
                return;

            auto code = res.json["userCode"].toString();
            auto device = res.json["deviceCode"].toString();
            if (res.status != 200 || code.isEmpty() || device.isEmpty())
            {
                self->setState (res.status == 0 ? offlineState()
                                                : errorState ("Couldn't start sign-in", "Something went wrong on our side. Try again in a moment."));
                return;
            }

            self->deviceCode = device;
            self->pollIntervalSeconds = juce::jmax (1, (int) res.json["interval"]);
            self->nextPollAt = juce::Time::getCurrentTime() + juce::RelativeTime::seconds (self->pollIntervalSeconds);

            State w;
            w.phase = State::Phase::waiting;
            w.userCode = code;
            w.verificationUrl = res.json["verificationUriComplete"].toString();
            w.expiresAt = juce::Time::getCurrentTime() + juce::RelativeTime::seconds ((double) (int) res.json["expiresIn"]);
            self->setState (w);
            self->openBrowserAgain();
        });
    });
}

void RetrackAccount::openBrowserAgain()
{
    if (state.verificationUrl.isNotEmpty())
        juce::URL (state.verificationUrl).launchInDefaultBrowser();
}

void RetrackAccount::cancel()
{
    ++generation;
    deviceCode = {};
    pollInFlight = false;
    setState ({});
}

void RetrackAccount::signOut()
{
    ++generation;
    auto oldToken = token;
    token = {};
    accountFile().deleteFile();
    fileStamp = {};
    setState ({});

    // Revoke the key on the server too. Best effort: if this fails the key still
    // expires after 90 days unused, and it can be removed in Settings on the site.
    if (oldToken.isNotEmpty())
        runInBackground ([oldToken] { request ("/api/plugin/auth/signout", juce::var (new juce::DynamicObject()), oldToken); });
}

//==============================================================================
void RetrackAccount::timerCallback()
{
    if (state.phase == State::Phase::waiting)
    {
        if (juce::Time::getCurrentTime() > state.expiresAt)
        {
            ++generation;
            deviceCode = {};
            setState (errorState ("That code expired", "Codes last 10 minutes. Start again to get a new one."));
        }
        else if (! pollInFlight && juce::Time::getCurrentTime() >= nextPollAt)
        {
            poll();
        }
    }

    // Another instance (or process) signed in or out.
    if (accountFile().getLastModificationTime() != fileStamp
        && state.phase != State::Phase::starting
        && state.phase != State::Phase::waiting)
        loadFromFile (false);
}

void RetrackAccount::poll()
{
    pollInFlight = true;
    auto gen = generation;
    juce::DynamicObject::Ptr body = new juce::DynamicObject();
    body->setProperty ("deviceCode", deviceCode);
    juce::var bodyVar (body.get());

    juce::WeakReference<RetrackAccount> weak (this);
    runInBackground ([weak, gen, bodyVar]
    {
        auto res = request ("/api/plugin/auth/token", bodyVar, {});
        juce::MessageManager::callAsync ([weak, gen, res]
        {
            auto* self = weak.get();
            if (self == nullptr || gen != self->generation)
                return;

            self->pollInFlight = false;
            auto status = res.json["status"].toString();

            if (status == "approved" && res.json["token"].toString().isNotEmpty())
            {
                self->token = res.json["token"].toString();
                self->deviceCode = {};
                State s;
                s.phase = State::Phase::signedIn;
                s.name = res.json["user"]["name"].toString();
                s.avatarSvg = res.json["user"]["avatarSvg"].toString();
                self->setState (s);
                self->saveToFile();
                self->verifyToken(); // picks up isAdmin
                return;
            }
            if (status == "denied")
            {
                self->deviceCode = {};
                self->setState (errorState ("Sign-in was denied", "Someone pressed Deny on retrackthis.com. Start again if that was a mistake."));
                return;
            }
            if (status == "expired")
            {
                self->deviceCode = {};
                self->setState (errorState ("That code expired", "Codes last 10 minutes. Start again to get a new one."));
                return;
            }
            if (status == "slow_down")
                self->pollIntervalSeconds = juce::jmax (self->pollIntervalSeconds + 1, (int) res.json["interval"]);

            // pending, slow_down, or a dropped connection: keep waiting until the code expires.
            self->nextPollAt = juce::Time::getCurrentTime() + juce::RelativeTime::seconds (self->pollIntervalSeconds);
        });
    });
}

void RetrackAccount::verifyToken()
{
    auto gen = generation;
    auto t = token;
    juce::WeakReference<RetrackAccount> weak (this);
    runInBackground ([weak, gen, t]
    {
        juce::URL url (baseUrl() + "/api/plugin/me");
        int status = 0;
        juce::var json;
        if (auto stream = url.createInputStream (juce::URL::InputStreamOptions (juce::URL::ParameterHandling::inAddress)
                                                     .withExtraHeaders ("Authorization: Bearer " + t)
                                                     .withConnectionTimeoutMs (10000)
                                                     .withStatusCode (&status)))
            json = juce::JSON::parse (stream->readEntireStreamAsString());

        juce::MessageManager::callAsync ([weak, gen, t, status, json]
        {
            auto* self = weak.get();
            if (self == nullptr || gen != self->generation || self->token != t)
                return;

            if (status == 401)
            {
                // Disconnected on the site, or unused for 90 days.
                self->token = {};
                accountFile().deleteFile();
                self->fileStamp = {};
                self->setState (errorState ("You've been signed out", "This plugin was disconnected from your account. Sign in again to keep posting."));
            }
            else if (status == 200 && json["name"].toString().isNotEmpty()
                     && (json["name"].toString() != self->state.name || json["avatarSvg"].toString() != self->state.avatarSvg
                         || (bool) json["isAdmin"] != self->state.isAdmin))
            {
                // They changed their name or avatar on the site.
                auto s = self->state;
                s.name = json["name"].toString();
                s.avatarSvg = json["avatarSvg"].toString();
                s.isAdmin = (bool) json["isAdmin"];
                self->setState (s);
                self->saveToFile();
            }
            // Offline: stay signed in with what we saved.
        });
    });
}

//==============================================================================
void RetrackAccount::setState (State s)
{
    state = std::move (s);
    sendChangeMessage();
}

juce::File RetrackAccount::accountFile()
{
    return juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
        .getChildFile ("Application Support/RetrackThis/Retrack/account.json");
}

void RetrackAccount::saveToFile()
{
    auto file = accountFile();
    file.getParentDirectory().createDirectory();

    juce::DynamicObject::Ptr obj = new juce::DynamicObject();
    obj->setProperty ("site", baseUrl());
    obj->setProperty ("token", token);
    obj->setProperty ("name", state.name);
    obj->setProperty ("avatarSvg", state.avatarSvg);

    // Create it private (owner read/write only) before the key goes in.
    file.deleteFile();
    file.create();
    ::chmod (file.getFullPathName().toRawUTF8(), S_IRUSR | S_IWUSR);
    file.replaceWithText (juce::JSON::toString (juce::var (obj.get())));
    ::chmod (file.getFullPathName().toRawUTF8(), S_IRUSR | S_IWUSR);
    fileStamp = file.getLastModificationTime();
}

void RetrackAccount::loadFromFile (bool verifyWithServer)
{
    auto file = accountFile();
    fileStamp = file.getLastModificationTime();
    auto json = juce::JSON::parse (file.loadFileAsString());
    auto savedToken = json["token"].toString();

    if (savedToken.isEmpty() || json["site"].toString() != baseUrl())
    {
        if (token.isNotEmpty() || state.phase == State::Phase::signedIn)
        {
            ++generation;
            token = {};
            setState ({});
        }
        return;
    }

    auto changed = savedToken != token;
    token = savedToken;
    State s;
    s.phase = State::Phase::signedIn;
    s.name = json["name"].toString();
    s.avatarSvg = json["avatarSvg"].toString();
    setState (s);

    if (verifyWithServer || changed)
        verifyToken();
}

void RetrackAccount::runInBackground (std::function<void()> fn)
{
    pool.addJob (std::move (fn));
}

RetrackAccount::Response RetrackAccount::request (const juce::String& path, const juce::var& body, const juce::String& bearer)
{
    juce::String headers ("Content-Type: application/json");
    if (bearer.isNotEmpty())
        headers << "\r\nAuthorization: Bearer " << bearer;

    auto url = juce::URL (baseUrl() + path).withPOSTData (juce::JSON::toString (body, true));
    Response res;
    if (auto stream = url.createInputStream (juce::URL::InputStreamOptions (juce::URL::ParameterHandling::inPostData)
                                                 .withHttpRequestCmd ("POST")
                                                 .withExtraHeaders (headers)
                                                 .withConnectionTimeoutMs (15000)
                                                 .withStatusCode (&res.status)))
        res.json = juce::JSON::parse (stream->readEntireStreamAsString());
    return res;
}
