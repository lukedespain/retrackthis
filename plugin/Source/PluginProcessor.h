#pragma once

#include <JuceHeader.h>

/**
 * Spike only: records whatever passes through this plugin while the host
 * transport is playing, and writes a WAV plus a sidecar text file with the
 * host's tempo/time-signature/position at the start of that pass. Does not
 * alter the audio (pure pass-through) — this is purely to prove two
 * instances can agree on "where we are" in the host.
 */
class RetrackThisBridgeProcessor : public juce::AudioProcessor
{
public:
    RetrackThisBridgeProcessor();
    ~RetrackThisBridgeProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

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

    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*, int) override {}

    juce::String getStatusText() const { return statusText; }

private:
    void startCapture(double bpm, int numerator, int denominator, double startSeconds, juce::int64 startSamples);
    void stopCapture();

    juce::TimeSliceThread backgroundThread { "Bridge Capture Writer" };
    std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter> threadedWriter;
    juce::CriticalSection writerLock;

    bool wasPlaying = false;
    double currentSampleRate = 44100.0;
    juce::String instanceId;
    juce::File lastCaptureFile;
    juce::String statusText { "Idle - waiting for playback" };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RetrackThisBridgeProcessor)
};
