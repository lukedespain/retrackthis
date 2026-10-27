#include "PluginProcessor.h"
#include "PluginEditor.h"

RetrackProcessor::RetrackProcessor()
    : AudioProcessor(BusesProperties()
                          .withInput("Input", juce::AudioChannelSet::stereo(), true)
                          .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
    writerThread.startThread();
    session->add(this);
}

RetrackProcessor::~RetrackProcessor()
{
    session->remove(this);
    closeTake();
    writerThread.stopThread(2000);
}

void RetrackProcessor::prepareToPlay(double sampleRate, int)
{
    sampleRateNow = sampleRate;
}

void RetrackProcessor::releaseResources() {}

bool RetrackProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    return layouts.getMainOutputChannelSet() == layouts.getMainInputChannelSet()
           && ! layouts.getMainOutputChannelSet().isDisabled();
}

void RetrackProcessor::updateTrackProperties(const TrackProperties& props)
{
    const juce::SpinLock::ScopedLockType sl(nameLock);
    trackName = props.name;
}

juce::String RetrackProcessor::getTrackName() const
{
    const juce::SpinLock::ScopedLockType sl(nameLock);
    return trackName;
}

bool RetrackProcessor::isBed() const
{
    switch (getRoleSetting())
    {
        case Role::part: return false;
        case Role::bed:  return true;
        case Role::automatic: break;
    }
    auto name = getTrackName().toLowerCase();
    return name.contains("stereo out") || name == "output" || name.startsWith("output ")
           || name.contains("master") || name.contains("main out");
}

void RetrackProcessor::getStateInformation(juce::MemoryBlock& dest)
{
    juce::MemoryOutputStream(dest, false).writeInt(roleSetting.load());
}

void RetrackProcessor::setStateInformation(const void* data, int size)
{
    if (size >= 4)
        roleSetting = juce::jlimit(0, 2, juce::MemoryInputStream(data, (size_t) size, false).readInt());
}

//==============================================================================
void RetrackProcessor::prepareTake(const juce::File& folder, int partIndex, int numParts, bool needsLoop,
                                   const juce::StringArray& partNames,
                                   juce::Array<juce::File>& partFilesOut, juce::Array<juce::File>& bedFilesOut)
{
    auto makeWriter = [this](const juce::File& file) -> std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter>
    {
        file.deleteFile();
        auto stream = std::make_unique<juce::FileOutputStream>(file);
        if (! stream->openedOk())
            return {};
        juce::WavAudioFormat wav;
        std::unique_ptr<juce::AudioFormatWriter> w(wav.createWriterFor(stream.get(), sampleRateNow.load(),
                                                                         (unsigned int) juce::jmax(1, getTotalNumInputChannels()),
                                                                         24, {}, 0));
        if (w == nullptr)
            return {};
        stream.release();
        return std::make_unique<juce::AudioFormatWriter::ThreadedWriter>(w.release(), writerThread, 1 << 17);
    };

    auto safe = [](const juce::String& s) { return juce::File::createLegalFileName(s.isEmpty() ? juce::String("Track") : s); };

    const juce::ScopedLock sl(takeLock);
    partWriter.reset();
    bedWriters.clear();
    myPartIndex = isBed() ? -1 : partIndex;

    if (isBed())
    {
        for (int i = 0; i < numParts; ++i)
        {
            auto file = folder.getChildFile("bed-" + juce::String(i + 1) + "-" + safe(partNames[i]) + ".wav");
            bedWriters.push_back(makeWriter(file));
            bedFilesOut.add(file);
        }
    }
    else if (partIndex >= 0)
    {
        auto file = folder.getChildFile("part-" + juce::String(partIndex + 1) + "-" + safe(partNames[partIndex]) + ".wav");
        partWriter = makeWriter(file);
        partFilesOut.add(file);
    }

    clock.reset(numParts, needsLoop);
    clockState = (int) CaptureClock::State::idle;
    clockFailure = (int) CaptureClock::Failure::none;
    clockPass = 0;
    samplesInPass = 0;
    totalSamples = 0;
}

void RetrackProcessor::closeTake()
{
    armed = false;
    const juce::ScopedLock sl(takeLock);
    partWriter.reset(); // flushes and closes the files
    bedWriters.clear();
}

void RetrackProcessor::writeAndMute(juce::AudioBuffer<float>& buffer, const CaptureClock::Segment& seg)
{
    const int channels = juce::jmin(buffer.getNumChannels(), 8);
    const float* ptrs[8] = {};
    for (int c = 0; c < channels; ++c)
        ptrs[c] = buffer.getReadPointer(c, seg.start);

    if (myPartIndex >= 0)
    {
        if (seg.pass == myPartIndex)
        {
            if (partWriter != nullptr)
                partWriter->write(ptrs, seg.length);
            // This part's loop: send silence on so the Bed records the song without it.
            for (int c = 0; c < buffer.getNumChannels(); ++c)
                buffer.clear(c, seg.start, seg.length);
        }
    }
    else if (juce::isPositiveAndBelow(seg.pass, (int) bedWriters.size()) && bedWriters[(size_t) seg.pass] != nullptr)
    {
        bedWriters[(size_t) seg.pass]->write(ptrs, seg.length);
    }
}

void RetrackProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    for (auto i = getTotalNumInputChannels(); i < getTotalNumOutputChannels(); ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    CaptureClock::Position pos;
    pos.numSamples = buffer.getNumSamples();
    pos.sampleRate = getSampleRate() > 0 ? getSampleRate() : sampleRateNow.load();

    if (auto* ph = getPlayHead())
        if (auto p = ph->getPosition())
        {
            pos.playing = p->getIsPlaying();
            pos.looping = p->getIsLooping();
            pos.ppq = p->getPpqPosition().orFallback(0.0);
            pos.bpm = p->getBpm().orFallback(120.0);
            if (auto lp = p->getLoopPoints())
            {
                pos.loopStart = lp->ppqStart;
                pos.loopEnd = lp->ppqEnd;
            }
            if (auto ts = p->getTimeSignature())
            {
                timeSigNum = ts->numerator;
                timeSigDen = ts->denominator;
            }
            lastBpm = pos.bpm;
            loopingNow = pos.looping;
            loopSeconds = pos.looping ? (pos.loopEnd - pos.loopStart) * 60.0 / juce::jmax(1.0, pos.bpm) : 0.0;
        }

    lastBlockMs = juce::Time::getMillisecondCounter();
    if (! armed)
        return;

    const juce::ScopedTryLock tl(takeLock);
    if (! tl.isLocked())
        return;

    for (auto& seg : clock.advance(pos))
        writeAndMute(buffer, seg);

    clockState = (int) clock.getState();
    clockFailure = (int) clock.getFailure();
    clockPass = clock.getPass();
    samplesInPass = clock.getSamplesInPass();
    totalSamples = clock.getTotalSamples();
}

void RetrackProcessor::checkForStall()
{
    if (! armed || getClockState() != CaptureClock::State::recording)
        return;
    if (juce::Time::getMillisecondCounter() - lastBlockMs.load() < 500)
        return;

    const juce::ScopedLock sl(takeLock);
    CaptureClock::Position stopped;
    stopped.numSamples = 1;
    stopped.sampleRate = sampleRateNow.load();
    clock.advance(stopped);
    clockState = (int) clock.getState();
    clockFailure = (int) clock.getFailure();
}

//==============================================================================
RetrackAccount& RetrackProcessor::getAccount()
{
    JUCE_ASSERT_MESSAGE_THREAD
    if (account == nullptr)
        account = std::make_unique<juce::SharedResourcePointer<RetrackAccount>>();
    return **account;
}

juce::AudioProcessorEditor* RetrackProcessor::createEditor()
{
    return new RetrackEditor(*this);
}

// This creates new instances of the plugin.
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new RetrackProcessor();
}
