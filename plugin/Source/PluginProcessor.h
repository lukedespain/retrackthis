#pragma once

#include <JuceHeader.h>
#include "RetrackAccount.h"
#include "RetrackSession.h"
#include "CaptureClock.h"

/**
 * One Retrack copy on a track. It passes audio through untouched, except while
 * a take is being captured:
 *   - a Part copy records its track during its own loop, then sends silence on so
 *     the Bed hears the song without it;
 *   - the Bed copy (on Stereo Out) records every loop, one bed file per part.
 * All copies share a RetrackSession, and each runs its own CaptureClock on the
 * host playhead, which is identical across copies, so they agree on every split.
 */
class RetrackProcessor : public juce::AudioProcessor
{
public:
    RetrackProcessor();
    ~RetrackProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    void updateTrackProperties(const TrackProperties&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock&) override;
    void setStateInformation(const void*, int) override;

    /** Created on the message thread when the editor first opens, then kept for
        the life of the plugin so a sign-in keeps going with the window closed. */
    RetrackAccount& getAccount();
    RetrackSession& getSession() { return *session; }

    //==============================================================================
    enum class Role { automatic = 0, part = 1, bed = 2 };

    /** Bed on a track named like the main output, Part everywhere else, unless overridden. */
    bool isBed() const;
    Role getRoleSetting() const { return (Role) roleSetting.load(); }
    void setRoleSetting(Role r) { roleSetting = (int) r; }
    juce::String getTrackName() const;

    // Capture (called by RetrackSession on the message thread).
    void prepareTake(const juce::File& folder, int partIndex, int numParts, bool needsLoop,
                     const juce::StringArray& partNames,
                     juce::Array<juce::File>& partFilesOut, juce::Array<juce::File>& bedFilesOut);
    void closeTake();
    void setArmed(bool a) { armed = a; }
    /** Some hosts stop calling processBlock once playback stops; treat a silent
        gap while recording as the stop (called from the session's timer). */
    void checkForStall();

    CaptureClock::State getClockState() const { return (CaptureClock::State) clockState.load(); }
    CaptureClock::Failure getClockFailure() const { return (CaptureClock::Failure) clockFailure.load(); }
    int getClockPass() const { return clockPass; }
    double getSecondsInPass() const { return (double) samplesInPass.load() / juce::jmax(1.0, sampleRateNow.load()); }
    double getTotalSeconds() const { return (double) totalSamples.load() / juce::jmax(1.0, sampleRateNow.load()); }
    double getLastBpm() const { return lastBpm; }
    /** Length of Logic's cycle in seconds, or 0 with cycle off. */
    double getLoopSeconds() const { return loopSeconds; }
    bool isLoopingNow() const { return loopingNow; }
    int getTimeSigNumerator() const { return timeSigNum; }
    int getTimeSigDenominator() const { return timeSigDen; }

private:
    void writeAndMute(juce::AudioBuffer<float>&, const CaptureClock::Segment&);

    juce::SharedResourcePointer<RetrackSession> session;
    std::unique_ptr<juce::SharedResourcePointer<RetrackAccount>> account;

    std::atomic<int> roleSetting { (int) Role::automatic };
    juce::String trackName;
    mutable juce::SpinLock nameLock;

    // Take state. Writers and clock are guarded by takeLock; the audio thread only try-locks.
    juce::CriticalSection takeLock;
    juce::TimeSliceThread writerThread { "Retrack Capture Writer" };
    std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter> partWriter;
    std::vector<std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter>> bedWriters;
    CaptureClock clock;
    int myPartIndex = -1;

    std::atomic<bool> armed { false };
    std::atomic<juce::uint32> lastBlockMs { 0 };
    std::atomic<int> clockState { (int) CaptureClock::State::idle };
    std::atomic<int> clockFailure { (int) CaptureClock::Failure::none };
    std::atomic<int> clockPass { 0 };
    std::atomic<juce::int64> samplesInPass { 0 }, totalSamples { 0 };
    std::atomic<double> sampleRateNow { 48000.0 }, lastBpm { 120.0 };
    std::atomic<int> timeSigNum { 4 }, timeSigDen { 4 };
    std::atomic<double> loopSeconds { 0.0 };
    std::atomic<bool> loopingNow { false };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RetrackProcessor)
};
