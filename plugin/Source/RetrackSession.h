#pragma once

#include <JuceHeader.h>

class RetrackProcessor;

/**
 * Everything the Retrack copies in one Logic project share: who's here (Parts
 * and the Bed), whether capture is armed, and the finished take.
 *
 * Logic runs every copy in one process (the probe test confirmed it), so this is
 * one in-memory object held with juce::SharedResourcePointer. The member list is
 * touched from any thread under a spin lock; everything else is message-thread.
 */
class RetrackSession : public juce::ChangeBroadcaster,
                       private juce::Timer
{
public:
    RetrackSession();
    ~RetrackSession() override;

    void add (RetrackProcessor*);
    void remove (RetrackProcessor*);

    /** Part copies in the order they were inserted, which is the loop order. */
    juce::Array<RetrackProcessor*> getParts() const;
    juce::Array<RetrackProcessor*> getBeds() const;
    juce::StringArray getPartNames() const;

    //==============================================================================
    enum class Phase { setup, armed, capturing, captured, failed };

    struct Take
    {
        juce::File folder;
        juce::StringArray partNames;
        juce::Array<juce::File> partFiles, bedFiles;
        double seconds = 0.0, bpm = 0.0;
        int timeSigNum = 4, timeSigDen = 4;
    };

    Phase getPhase() const { return phase; }
    /** Why Arm is unavailable, or empty when it's ready. */
    juce::String whyNotReady() const;
    bool needsCycle() const { return getParts().size() > 1; }
    /** A copy saw play with cycle off while 2+ parts are armed. */
    bool cycleWasOff() const;

    bool arm();
    void disarm();
    /** After a failed take: same parts, fresh files, armed again. */
    void rearm() { arm(); }
    void clearTake();

    const Take& getTake() const { return take; }
    juce::String getFailureText() const { return failureText; }

    /** Progress while capturing: current loop (0-based) and seconds into it. */
    int getCurrentPass() const;
    double getSecondsInPass() const;

private:
    void timerCallback() override;
    void setPhase (Phase);
    void writeCaptureLog (const juce::String& outcome) const;
    juce::String membersSignature() const;
    static juce::File capturesFolder();

    mutable juce::SpinLock membersLock;
    juce::Array<RetrackProcessor*> members;

    Phase phase = Phase::setup;
    Take take;
    juce::String failureText;
    juce::String lastMembersSignature;
    juce::uint32 outOfStepSinceMs = 0; // when the copies started disagreeing on the loop, or 0

    JUCE_DECLARE_NON_COPYABLE (RetrackSession)
};
