#include "PluginProcessor.h"
#include "PluginEditor.h"

RetrackThisBridgeProcessor::RetrackThisBridgeProcessor()
    : AudioProcessor(BusesProperties()
                          .withInput("Input", juce::AudioChannelSet::stereo(), true)
                          .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
    instanceId = juce::Uuid().toString().substring(0, 8);
    backgroundThread.startThread();
}

RetrackThisBridgeProcessor::~RetrackThisBridgeProcessor()
{
    stopCapture();
    backgroundThread.stopThread(2000);
}

void RetrackThisBridgeProcessor::prepareToPlay(double sampleRate, int)
{
    currentSampleRate = sampleRate;
}

void RetrackThisBridgeProcessor::releaseResources()
{
    stopCapture();
}

bool RetrackThisBridgeProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    return layouts.getMainOutputChannelSet() == layouts.getMainInputChannelSet()
           && !layouts.getMainOutputChannelSet().isDisabled();
}

void RetrackThisBridgeProcessor::startCapture(double bpm, int numerator, int denominator,
                                               double startSeconds, juce::int64 startSamples)
{
    auto desktop = juce::File::getSpecialLocation(juce::File::userDesktopDirectory);
    auto timestamp = juce::Time::getCurrentTime().formatted("%Y%m%d-%H%M%S");
    auto baseName = "BridgeCapture-" + timestamp + "-" + instanceId;

    lastCaptureFile = desktop.getNonexistentChildFile(baseName, ".wav");
    auto sidecarFile = desktop.getChildFile(lastCaptureFile.getFileNameWithoutExtension() + ".txt");

    auto stream = std::make_unique<juce::FileOutputStream>(lastCaptureFile);
    if (!stream->openedOk())
    {
        statusText = "Could not open capture file";
        return;
    }

    juce::WavAudioFormat wavFormat;
    auto numChannels = (unsigned int) juce::jmax(1, getTotalNumOutputChannels());
    std::unique_ptr<juce::AudioFormatWriter> writer(
        wavFormat.createWriterFor(stream.get(), currentSampleRate, numChannels, 24, {}, 0));

    if (writer == nullptr)
    {
        statusText = "Could not create WAV writer";
        return;
    }

    stream.release(); // writer now owns the stream

    {
        const juce::ScopedLock sl(writerLock);
        threadedWriter.reset(new juce::AudioFormatWriter::ThreadedWriter(writer.release(), backgroundThread, 32768));
    }

    juce::String sidecar;
    sidecar << "instanceId: " << instanceId << "\n";
    sidecar << "sampleRate: " << currentSampleRate << "\n";
    sidecar << "bpm: " << bpm << "\n";
    sidecar << "timeSignature: " << numerator << "/" << denominator << "\n";
    sidecar << "startSeconds: " << startSeconds << "\n";
    sidecar << "startSamples: " << (double) startSamples << "\n";
    sidecar << "capturedAt: " << juce::Time::getCurrentTime().toISO8601(true) << "\n";
    sidecarFile.replaceWithText(sidecar);

    statusText = "Recording -> " + lastCaptureFile.getFileName();
}

void RetrackThisBridgeProcessor::stopCapture()
{
    const juce::ScopedLock sl(writerLock);
    if (threadedWriter != nullptr)
    {
        threadedWriter.reset();
        statusText = "Captured: " + lastCaptureFile.getFileName();
    }
}

void RetrackThisBridgeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    bool isPlaying = false;
    double bpm = 120.0;
    int numerator = 4, denominator = 4;
    double startSeconds = 0.0;
    juce::int64 startSamples = 0;

    if (auto* playHead = getPlayHead())
    {
        if (auto position = playHead->getPosition())
        {
            isPlaying = position->getIsPlaying();

            if (auto bpmOpt = position->getBpm())
                bpm = *bpmOpt;

            if (auto tsOpt = position->getTimeSignature())
            {
                numerator = tsOpt->numerator;
                denominator = tsOpt->denominator;
            }

            if (auto samplesOpt = position->getTimeInSamples())
                startSamples = *samplesOpt;

            if (auto secondsOpt = position->getTimeInSeconds())
                startSeconds = *secondsOpt;
        }
    }

    if (isPlaying && !wasPlaying && captureArmed)
        startCapture(bpm, numerator, denominator, startSeconds, startSamples);
    else if (!isPlaying && wasPlaying)
        stopCapture();

    wasPlaying = isPlaying;

    {
        const juce::ScopedLock sl(writerLock);
        if (threadedWriter != nullptr)
            threadedWriter->write(buffer.getArrayOfReadPointers(), buffer.getNumSamples());
    }

    // Pass-through: buffer is left unmodified so audio continues downstream unaffected.
    juce::ignoreUnused(buffer);
}

BridgeAccount& RetrackThisBridgeProcessor::getAccount()
{
    JUCE_ASSERT_MESSAGE_THREAD
    if (account == nullptr)
        account = std::make_unique<juce::SharedResourcePointer<BridgeAccount>>();
    return **account;
}

juce::AudioProcessorEditor* RetrackThisBridgeProcessor::createEditor()
{
    return new RetrackThisBridgeEditor(*this);
}

// This creates new instances of the plugin.
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new RetrackThisBridgeProcessor();
}
