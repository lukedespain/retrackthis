#pragma once

#include <JuceHeader.h>

/**
 * Works out which samples of an audio block belong to which capture pass.
 *
 * With Logic's cycle on, one loop is one pass. Logic wraps back to the loop
 * start part-way through a block, so the split has to happen at the exact
 * sample, not at a block boundary (the probe test showed wraps landing 682,
 * 1364, 2046… samples into blocks). Every Retrack copy runs this on the same
 * playhead numbers, so they all agree on where each pass starts and ends.
 *
 * Pure logic with no audio or threads, so it can be tested on its own.
 */
class CaptureClock
{
public:
    struct Position
    {
        bool playing = false;
        bool looping = false;
        double ppq = 0.0;          // quarter notes at the block start
        double bpm = 120.0;
        double loopStart = 0.0, loopEnd = 0.0;
        double sampleRate = 48000.0;
        int numSamples = 0;
    };

    struct Segment
    {
        int start = 0, length = 0;
        int pass = 0;
    };

    enum class State { idle, waiting, recording, done, failed };
    enum class Failure { none, stoppedEarly, playheadMoved, needsCycle, tooShort };

    /** passes: how many loops to record (one per part). needsLoop: more than one part. */
    void reset (int passes, bool needsLoop);

    /** Call once per block while armed. Returns the recorded segments in this block. */
    juce::Array<Segment> advance (const Position&);

    State getState() const { return state; }
    Failure getFailure() const { return failure; }
    int getPass() const { return pass; }
    juce::int64 getSamplesInPass() const { return samplesInPass; }
    juce::int64 getTotalSamples() const { return totalSamples; }

    static constexpr double minSeconds = 5.0;

private:
    void fail (Failure f) { state = State::failed; failure = f; }

    int passes = 1;
    bool needsLoop = false;
    State state = State::idle;
    Failure failure = Failure::none;
    int pass = 0;
    juce::int64 samplesInPass = 0, totalSamples = 0;
    double expectedPpq = 0.0;
    bool loopTake = false; // this take is recording with cycle on
    double sampleRate = 48000.0;
};
