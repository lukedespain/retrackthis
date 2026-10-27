#pragma once

#include <JuceHeader.h>

/**
 * Test plugin only ("RT Bridge Probe"), answering two questions before we build
 * multi-part capture into Bridge:
 *   1. Can a plugin tell, sample-accurately, when Logic's cycle loops back?
 *   2. Can the Bridge copies on different tracks see each other (same process)?
 *
 * Put it on each Part track (role Part) and on Stereo Out (role Bed), turn on
 * cycle, play a few loops. On loop N the Nth Part mutes itself after recording,
 * so the Bed's pass N should be the mix minus that part. Every pass of every
 * copy is written to ~/Desktop/Bridge Probe/<time>/ with a log, for checking.
 */
class ProbeProcessor : public juce::AudioProcessor
{
public:
    enum Role { part = 0, bed = 1 };

    ProbeProcessor();
    ~ProbeProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout&) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    void updateTrackProperties (const TrackProperties&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }
    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}
    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int) override;

    void setRole (Role r) { role = r; }
    Role getRole() const { return (Role) role.load(); }
    juce::String getTrackName() const;
    juce::String describe() const;

    /** Parts in insertion order across every copy in this process. */
    static int partIndexOf (const ProbeProcessor*);
    static int numParts();
    static int numInstances();

private:
    void log (const juce::String&);
    void openPass (int pass);
    void closeWriter();
    static juce::File takeFolder (bool startNew);

    std::atomic<int> role { part };
    juce::String instanceId;
    juce::String trackName;
    mutable juce::SpinLock nameLock;

    double sampleRate = 44100.0;
    bool wasPlaying = false;
    int pass = 0;
    int myPartIndex = -1;
    int partsAtStart = 0;
    juce::int64 expectedNextSample = -1;

    juce::TimeSliceThread writerThread { "Probe Writer" };
    std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter> writer;
    juce::CriticalSection writerLock;

    juce::CriticalSection logLock;
    juce::StringArray pendingLog;
    juce::File logFile;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ProbeProcessor)
};
