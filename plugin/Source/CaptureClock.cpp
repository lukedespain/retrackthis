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
    // A block that starts just before the loop and runs into it is a pre-roll, not stale.
    const double blockEndPpq = p.ppq + p.numSamples / samplesPerPpq;
    const bool runsIntoLoop = state == State::waiting && p.ppq < p.loopStart && blockEndPpq > p.loopStart + onePpqSample;
    const bool outsideLoop = p.ppq < p.loopStart - onePpqSample || p.ppq >= p.loopEnd + 2.0 * onePpqSample;
    if (outsideLoop && ! runsIntoLoop)
    {
        if (state == State::recording)
            fail (Failure::playheadMoved);
        return out;
    }

    // A wrap that lands exactly on a block boundary. Depending on rounding, Logic reports the
    // next block either at the loop end or back at the loop start, and the previous block may
    // have come out a fraction of a sample short of the wrap. Either way this block is the
    // first of the next loop, so the wrap goes at its first sample.
    double ppq = p.ppq;
    bool wrapAtStart = false;
    if (state == State::recording)
    {
        const double tolerance = 2.0 * onePpqSample;
        const bool startsAtLoopEnd = ppq > p.loopEnd - 1.0e-6 * onePpqSample && ppq <= p.loopEnd + tolerance;
        const bool atLoopEnd = startsAtLoopEnd && std::abs (expectedPpq - p.loopEnd) <= tolerance;
        const bool wrapCounted = startsAtLoopEnd && std::abs (expectedPpq - p.loopStart) <= tolerance;
        const bool missedWrap = std::abs (ppq - p.loopStart) <= tolerance && std::abs (expectedPpq - p.loopEnd) <= tolerance;
        if (atLoopEnd || missedWrap)
        {
            wrapAtStart = true;
            ppq = p.loopStart;
        }
        else if (wrapCounted)
            ppq = p.loopStart; // the previous block already ended the loop
        else if (std::abs (ppq - expectedPpq) > tolerance)
        {
            fail (Failure::playheadMoved);
            return out;
        }
    }

    // Samples from the block start to the loop end (Logic wraps on the sample after this).
    const int toLoopEnd = (int) std::ceil ((p.loopEnd - ppq) * samplesPerPpq - 1.0e-6);

    int cursor = 0, leadIn = 0;
    if (state == State::waiting)
    {
        const double late = (p.ppq - p.loopStart) * samplesPerPpq;
        if (runsIntoLoop)
            cursor = juce::jlimit (0, p.numSamples - 1, (int) std::ceil (-late - 1.0e-6)); // pre-roll: begin at the loop start
        else if (late < 1.0)
            cursor = 0; // started right at the loop start
        else if (late <= maxLateSeconds * p.sampleRate)
            leadIn = (int) std::llround (late); // this copy's first block was stale or late; every copy still starts loop 1 together
        else if (toLoopEnd < p.numSamples)
            cursor = juce::jmax (0, toLoopEnd); // started mid-loop: begin at the wrap
        else
            return out; // started mid-loop: wait for the wrap

        state = State::recording;
        loopTake = true;
        pass = 0;
        samplesInPass = leadIn;
        totalSamples += leadIn;
    }

    if (wrapAtStart)
    {
        ++pass;
        samplesInPass = 0;
        if (pass >= passes)
        {
            state = State::done;
            return out;
        }
    }

    int wrapAt = toLoopEnd;
    while (cursor < p.numSamples && state == State::recording)
    {
        const int end = (wrapAt > cursor && wrapAt <= p.numSamples) ? wrapAt : p.numSamples;
        out.add ({ cursor, end - cursor, pass, out.isEmpty() ? leadIn : 0 });
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
                                 : ppq + p.numSamples / samplesPerPpq;
    return out;
}
