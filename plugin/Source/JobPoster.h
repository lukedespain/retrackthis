#pragma once

#include <JuceHeader.h>

/**
 * Uploads each Part and Bed to retrackthis.com and posts the jobs, using the
 * same endpoints as the website (POST /api/uploads/sign, then POST /api/jobs;
 * two or more parts go up as one project with one payment). Runs on its own
 * thread and reports back on the message thread.
 */
class JobPoster : private juce::Thread
{
public:
    struct Job
    {
        juce::String trackName;
        juce::File partFile, bedFile;
        juce::String instrumentId, instrumentLabel;
        int priceUsd = 0;
        int dueDays = 7;
        juce::String notes;
    };

    struct Request
    {
        juce::String baseUrl, token, postedFrom;
        juce::String title, musicalKey; // key id like "c-major", or empty
        double bpm = 0.0, seconds = 0.0;
        bool isTest = false;
        juce::Array<Job> jobs;
    };

    struct Result
    {
        bool ok = false;
        juce::String error;
        juce::String firstJobId;
        bool isTest = false;
        bool signedOut = false; // the key was rejected
    };

    JobPoster() : juce::Thread ("Retrack Poster") {}
    ~JobPoster() override { stopThread (10000); }

    void start (Request, std::function<void (const juce::String& progress)> onProgress,
                std::function<void (const Result&)> onDone);
    bool isBusy() const { return isThreadRunning(); }

private:
    void run() override;
    void progress (const juce::String&);
    juce::String upload (const juce::File&, const juce::String& kind, Result&);

    Request request;
    std::function<void (const juce::String&)> onProgress;
    std::function<void (const Result&)> onDone;
};
