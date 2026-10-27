#include "ProbeProcessor.h"
#include <unistd.h>

namespace
{
    juce::SpinLock registryLock;
    juce::Array<ProbeProcessor*> registry; // every live copy in this process, in insertion order

    juce::SpinLock takeLock;
    juce::File currentTake;
    juce::int64 takeStartedMs = 0;
}

ProbeProcessor::ProbeProcessor()
    : AudioProcessor (BusesProperties().withInput ("Input", juce::AudioChannelSet::stereo(), true)
                                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{
    instanceId = juce::Uuid().toString().substring (0, 6);
    writerThread.startThread();
    const juce::SpinLock::ScopedLockType sl (registryLock);
    registry.add (this);
}

ProbeProcessor::~ProbeProcessor()
{
    {
        const juce::SpinLock::ScopedLockType sl (registryLock);
        registry.removeFirstMatchingValue (this);
    }
    closeWriter();
    writerThread.stopThread (2000);
}

int ProbeProcessor::partIndexOf (const ProbeProcessor* p)
{
    const juce::SpinLock::ScopedLockType sl (registryLock);
    int i = 0;
    for (auto* r : registry)
    {
        if (r->getRole() != part) continue;
        if (r == p) return i;
        ++i;
    }
    return -1;
}

int ProbeProcessor::numParts()
{
    const juce::SpinLock::ScopedLockType sl (registryLock);
    int n = 0;
    for (auto* r : registry)
        if (r->getRole() == part) ++n;
    return n;
}

int ProbeProcessor::numInstances()
{
    const juce::SpinLock::ScopedLockType sl (registryLock);
    return registry.size();
}

juce::String ProbeProcessor::getTrackName() const
{
    const juce::SpinLock::ScopedLockType sl (nameLock);
    return trackName;
}

void ProbeProcessor::updateTrackProperties (const TrackProperties& props)
{
    {
        const juce::SpinLock::ScopedLockType sl (nameLock);
        trackName = props.name;
    }
    log ("track properties: name=\"" + getTrackName() + "\"");
}

juce::String ProbeProcessor::describe() const
{
    auto name = getTrackName();
    return juce::String (getRole() == bed ? "Bed" : "Part") + " #" + instanceId
           + (name.isNotEmpty() ? " on \"" + name + "\"" : juce::String (" (no track name from host)"))
           + "\npid " + juce::String ((int) getpid())
           + " | copies seen: " + juce::String (numInstances())
           + " | parts: " + juce::String (numParts())
           + (getRole() == part ? " | my part index: " + juce::String (partIndexOf (this)) : juce::String());
}

void ProbeProcessor::getStateInformation (juce::MemoryBlock& dest)
{
    juce::MemoryOutputStream (dest, false).writeInt (getRole());
}

void ProbeProcessor::setStateInformation (const void* data, int size)
{
    if (size >= 4)
        setRole (juce::MemoryInputStream (data, (size_t) size, false).readInt() == bed ? bed : part);
}

void ProbeProcessor::prepareToPlay (double sr, int block)
{
    sampleRate = sr;
    log ("prepareToPlay sr=" + juce::String (sr) + " block=" + juce::String (block));
}

void ProbeProcessor::releaseResources()
{
    closeWriter();
}

bool ProbeProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    return layouts.getMainOutputChannelSet() == layouts.getMainInputChannelSet()
           && ! layouts.getMainOutputChannelSet().isDisabled();
}

juce::File ProbeProcessor::takeFolder (bool startNew)
{
    const juce::SpinLock::ScopedLockType sl (takeLock);
    auto now = juce::Time::currentTimeMillis();
    // All copies start playing within the same moment; share one folder per take.
    if (startNew && now - takeStartedMs > 1500)
    {
        takeStartedMs = now;
        currentTake = juce::File::getSpecialLocation (juce::File::userDesktopDirectory)
                          .getChildFile ("Bridge Probe")
                          .getChildFile (juce::Time (now).formatted ("%H-%M-%S"));
        currentTake.createDirectory();
    }
    return currentTake;
}

void ProbeProcessor::log (const juce::String& line)
{
    const juce::ScopedLock sl (logLock);
    auto stamped = juce::Time::getCurrentTime().formatted ("%H:%M:%S") + " [" + instanceId + "] " + line;
    if (logFile == juce::File())
    {
        pendingLog.add (stamped);
        return;
    }
    for (auto& l : pendingLog) logFile.appendText (l + "\n");
    pendingLog.clear();
    logFile.appendText (stamped + "\n");
}

void ProbeProcessor::closeWriter()
{
    const juce::ScopedLock sl (writerLock);
    writer.reset();
}

void ProbeProcessor::openPass (int p)
{
    auto folder = takeFolder (false);
    auto name = getTrackName().isNotEmpty() ? getTrackName() : instanceId;
    auto file = folder.getNonexistentChildFile ((getRole() == bed ? "bed" : "part") + juce::String ("-")
                                                + juce::File::createLegalFileName (name)
                                                + "-pass" + juce::String (p + 1), ".wav");

    auto stream = std::make_unique<juce::FileOutputStream> (file);
    juce::WavAudioFormat wav;
    std::unique_ptr<juce::AudioFormatWriter> w (wav.createWriterFor (stream.get(), sampleRate,
                                                                     (unsigned int) juce::jmax (1, getTotalNumInputChannels()), 24, {}, 0));
    if (w == nullptr) return;
    stream.release();

    const juce::ScopedLock sl (writerLock);
    writer.reset (new juce::AudioFormatWriter::ThreadedWriter (w.release(), writerThread, 1 << 17));
}

void ProbeProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    const int n = buffer.getNumSamples();

    bool playing = false, looping = false;
    juce::int64 samplePos = 0;
    double ppq = 0, loopStart = 0, loopEnd = 0;

    if (auto* ph = getPlayHead())
        if (auto pos = ph->getPosition())
        {
            playing = pos->getIsPlaying();
            looping = pos->getIsLooping();
            samplePos = pos->getTimeInSamples().orFallback (0);
            ppq = pos->getPpqPosition().orFallback (0.0);
            if (auto lp = pos->getLoopPoints()) { loopStart = lp->ppqStart; loopEnd = lp->ppqEnd; }
        }

    auto where = [&] {
        return "sample=" + juce::String (samplePos) + " ppq=" + juce::String (ppq, 4) + " block=" + juce::String (n)
               + " looping=" + juce::String (looping ? "yes" : "no")
               + " loop=" + juce::String (loopStart, 3) + ".." + juce::String (loopEnd, 3);
    };

    if (playing && ! wasPlaying)
    {
        pass = 0;
        myPartIndex = getRole() == part ? partIndexOf (this) : -1;
        partsAtStart = numParts();
        logFile = takeFolder (true).getChildFile ("log-" + instanceId + ".txt");
        log ("PLAY " + describe().replace ("\n", " | ") + " | " + where());
        openPass (pass);
    }
    else if (playing && wasPlaying && samplePos != expectedNextSample)
    {
        // Position didn't continue where the last block ended: cycle wrapped (or the playhead moved).
        ++pass;
        log ("JUMP to pass " + juce::String (pass + 1) + " expected=" + juce::String (expectedNextSample) + " " + where());
        closeWriter();
        openPass (pass);
    }
    else if (! playing && wasPlaying)
    {
        log ("STOP after pass " + juce::String (pass + 1) + " " + where());
        closeWriter();
    }

    wasPlaying = playing;
    expectedNextSample = samplePos + n;

    if (playing)
    {
        {
            const juce::ScopedLock sl (writerLock);
            if (writer != nullptr)
                writer->write (buffer.getArrayOfReadPointers(), n);
        }
        // This part's pass: record it, but send silence on so the Bed hears the mix without it.
        if (getRole() == part && myPartIndex == pass && pass < partsAtStart)
            buffer.clear();
    }
}

//==============================================================================
class ProbeEditor : public juce::AudioProcessorEditor, private juce::Timer
{
public:
    explicit ProbeEditor (ProbeProcessor& p) : AudioProcessorEditor (&p), proc (p)
    {
        for (auto* b : { &partButton, &bedButton })
        {
            b->setClickingTogglesState (true);
            b->setRadioGroupId (1);
            addAndMakeVisible (b);
        }
        partButton.setToggleState (p.getRole() == ProbeProcessor::part, juce::dontSendNotification);
        bedButton.setToggleState (p.getRole() == ProbeProcessor::bed, juce::dontSendNotification);
        partButton.onClick = [this] { proc.setRole (ProbeProcessor::part); };
        bedButton.onClick = [this] { proc.setRole (ProbeProcessor::bed); };

        info.setJustificationType (juce::Justification::centred);
        info.setColour (juce::Label::textColourId, juce::Colours::white);
        addAndMakeVisible (info);
        setSize (420, 150);
        startTimerHz (4);
    }

    void paint (juce::Graphics& g) override { g.fillAll (juce::Colour (0xff111113)); }
    void resized() override
    {
        auto r = getLocalBounds().reduced (12);
        auto top = r.removeFromTop (30);
        partButton.setBounds (top.removeFromLeft (top.getWidth() / 2).reduced (4, 0));
        bedButton.setBounds (top.reduced (4, 0));
        info.setBounds (r);
    }

private:
    void timerCallback() override { info.setText ("RT Bridge Probe (test only)\n" + proc.describe(), juce::dontSendNotification); }

    ProbeProcessor& proc;
    juce::TextButton partButton { "Part" }, bedButton { "Bed (Stereo Out)" };
    juce::Label info;
};

juce::AudioProcessorEditor* ProbeProcessor::createEditor() { return new ProbeEditor (*this); }

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new ProbeProcessor(); }
