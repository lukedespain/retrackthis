#include "CaptureClock.h"

void CaptureClock::reset (int numPasses, bool loopRequired)
{
    passes = juce::jmax (1, numPasses);
    needsLoop = loopRequired;
    state = State::idle;
    failure = Failure::none;
    pass = 0;
    samplesInPass = totalSamples = 0;
    expectedPpq = 0.0;
    loopTake = false;
}

juce::Array<CaptureClock::Segment> CaptureClock::advance (const Position& p)
{
    juce::Array<Segment> out;
    if (state == State::done || state == State::failed || p.numSamples <= 0)
        return out;

    sampleRate = p.sampleRate;
    const double samplesPerPpq = p.sampleRate * 60.0 / juce::jmax (1.0, p.bpm);
    const double onePpqSample = 1.0 / samplesPerPpq;

    if (! p.playing)
    {
        if (state == State::recording)
        {
            // Stopping ends a take with cycle off; with cycle on, it means a loop was cut short.
            if (! loopTake)
            {
                if ((double) totalSamples / p.sampleRate >= minSeconds) state = State::done;
                else fail (Failure::tooShort);
            }
            else
                fail (Failure::stoppedEarly);
        }
        else if (state == State::waiting)
            state = State::idle;
        return out;
    }

    if (state == State::idle)
    {
        if (needsLoop && ! p.looping)
        {
            failure = Failure::needsCycle; // stays idle; the UI asks for Cycle
            return out;
        }
        failure = Failure::none;
        state = State::waiting;
    }

    // ---- Cycle off: one part, record from play until stop. ----
    if (! p.looping)
    {
        if (needsLoop || (state == State::recording && loopTake))
        {
            fail (Failure::playheadMoved); // cycle switched off mid-take
            return out;
        }
        if (state == State::waiting)
        {
            state = State::recording;
            loopTake = false;
            pass = 0;
        }
        out.add ({ 0, p.numSamples, 0 });
        samplesInPass += p.numSamples;
        totalSamples += p.numSamples;
        return out;
    }

    if (state == State::recording && ! loopTake)
    {
        fail (Failure::playheadMoved); // cycle switched on mid-take
        return out;
    }

    // ---- Cycle on: one loop per pass. ----
    const double loopLen = p.loopEnd - p.loopStart;
    if (loopLen <= 0.0)
        return out;

    // Logic sometimes hands one copy a stale block (old playhead) right as play starts.
    const bool outsideLoop = p.ppq < p.loopStart - onePpqSample || p.ppq >= p.loopEnd + onePpqSample;
    if (outsideLoop)
    {
        if (state == State::recording)
            fail (Failure::playheadMoved);
        return out;
    }

    if (state == State::recording && std::abs (p.ppq - expectedPpq) > 2.0 * onePpqSample)
    {
        fail (Failure::playheadMoved);
        return out;
    }

    // Samples from the block start to the loop end (Logic wraps on the sample after this).
    const int toLoopEnd = (int) std::ceil ((p.loopEnd - p.ppq) * samplesPerPpq - 1.0e-6);

    int cursor = 0;
    if (state == State::waiting)
    {
        if ((p.ppq - p.loopStart) * samplesPerPpq < 1.0)
            cursor = 0; // started right at the loop start
        else if (toLoopEnd < p.numSamples)
            cursor = toLoopEnd; // started mid-loop: begin at the wrap
        else
            return out; // started mid-loop: wait for the wrap

        state = State::recording;
        loopTake = true;
        pass = 0;
        samplesInPass = 0;
    }

    int wrapAt = toLoopEnd;
    while (cursor < p.numSamples && state == State::recording)
    {
        const int end = (wrapAt > cursor && wrapAt <= p.numSamples) ? wrapAt : p.numSamples;
        out.add ({ cursor, end - cursor, pass });
        samplesInPass += end - cursor;
        totalSamples += end - cursor;
        cursor = end;

        if (end == wrapAt)
        {
            ++pass;
            samplesInPass = 0;
            if (pass >= passes)
            {
                state = State::done;
                break;
            }
            wrapAt = -1; // a loop is longer than a block, so at most one wrap per block
        }
    }

    // Where the next block should start, to catch the playhead being moved.
    const int afterWrap = (toLoopEnd >= 0 && toLoopEnd <= p.numSamples) ? p.numSamples - toLoopEnd : -1;
    expectedPpq = afterWrap >= 0 ? p.loopStart + afterWrap / samplesPerPpq
                                 : p.ppq + p.numSamples / samplesPerPpq;
    return out;
}
