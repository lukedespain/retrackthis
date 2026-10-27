#include "RetrackSession.h"
#include "PluginProcessor.h"

namespace
{
    constexpr int maxParts = 8; // the site takes 2 to 8 parts per project
}

RetrackSession::RetrackSession()
{
    // Captures are only kept until they're posted; tidy anything older than a few days.
    for (auto& dir : capturesFolder().findChildFiles (juce::File::findDirectories, false))
        if (dir.getCreationTime() < juce::Time::getCurrentTime() - juce::RelativeTime::days (3))
            dir.deleteRecursively();

    startTimerHz (10);
}

RetrackSession::~RetrackSession()
{
    stopTimer();
}

juce::File RetrackSession::capturesFolder()
{
    return juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
        .getChildFile ("Application Support/RetrackThis/Retrack/Captures");
}

void RetrackSession::add (RetrackProcessor* p)
{
    const juce::SpinLock::ScopedLockType sl (membersLock);
    members.addIfNotAlreadyThere (p);
}

void RetrackSession::remove (RetrackProcessor* p)
{
    const juce::SpinLock::ScopedLockType sl (membersLock);
    members.removeFirstMatchingValue (p);
}

juce::Array<RetrackProcessor*> RetrackSession::getParts() const
{
    juce::Array<RetrackProcessor*> out;
    const juce::SpinLock::ScopedLockType sl (membersLock);
    for (auto* m : members)
        if (! m->isBed())
            out.add (m);
    return out;
}

juce::Array<RetrackProcessor*> RetrackSession::getBeds() const
{
    juce::Array<RetrackProcessor*> out;
    const juce::SpinLock::ScopedLockType sl (membersLock);
    for (auto* m : members)
        if (m->isBed())
            out.add (m);
    return out;
}

juce::StringArray RetrackSession::getPartNames() const
{
    juce::StringArray names;
    for (auto* p : getParts())
    {
        auto name = p->getTrackName().trim();
        if (name.isEmpty())
            name = "Track " + juce::String (names.size() + 1);
        names.add (name);
    }
    return names;
}

juce::String RetrackSession::whyNotReady() const
{
    const auto parts = getParts().size();
    const auto beds = getBeds().size();
    if (parts == 0)        return "Insert Retrack on a track you want retracked.";
    if (beds == 0)         return "Insert Retrack on the Stereo Out.";
    if (beds > 1)          return "Keep just one Retrack on the Stereo Out.";
    if (parts > maxParts)  return "A project can have up to 8 tracks to retrack.";
    return {};
}

bool RetrackSession::cycleWasOff() const
{
    for (auto* p : getParts())
        if (p->getClockFailure() == CaptureClock::Failure::needsCycle)
            return true;
    for (auto* b : getBeds())
        if (b->getClockFailure() == CaptureClock::Failure::needsCycle)
            return true;
    return false;
}

//==============================================================================
bool RetrackSession::arm()
{
    if (whyNotReady().isNotEmpty())
        return false;

    for (auto* p : getParts()) p->closeTake();
    for (auto* b : getBeds())  b->closeTake();
    if (take.folder.exists())
        take.folder.deleteRecursively();

    take = {};
    take.folder = capturesFolder().getChildFile (juce::Time::getCurrentTime().formatted ("%Y%m%d-%H%M%S"));
    take.folder.createDirectory();
    take.partNames = getPartNames();

    const auto parts = getParts();
    const bool loop = parts.size() > 1;
    for (int i = 0; i < parts.size(); ++i)
        parts[i]->prepareTake (take.folder, i, parts.size(), loop, take.partNames, take.partFiles, take.bedFiles);
    getBeds()[0]->prepareTake (take.folder, -1, parts.size(), loop, take.partNames, take.partFiles, take.bedFiles);

    for (auto* p : parts)     p->setArmed (true);
    for (auto* b : getBeds()) b->setArmed (true);

    failureText = {};
    lastMembersSignature = membersSignature(); // armed with exactly these copies
    setPhase (Phase::armed);
    return true;
}

void RetrackSession::disarm()
{
    for (auto* p : getParts()) p->closeTake();
    for (auto* b : getBeds())  b->closeTake();
    if (take.folder.exists())
        take.folder.deleteRecursively();
    take = {};
    setPhase (Phase::setup);
}

void RetrackSession::clearTake()
{
    if (take.folder.exists())
        take.folder.deleteRecursively();
    take = {};
    setPhase (Phase::setup);
}

int RetrackSession::getCurrentPass() const
{
    auto beds = getBeds();
    return beds.isEmpty() ? 0 : beds[0]->getClockPass();
}

double RetrackSession::getSecondsInPass() const
{
    auto beds = getBeds();
    return beds.isEmpty() ? 0.0 : beds[0]->getSecondsInPass();
}

juce::String RetrackSession::membersSignature() const
{
    juce::String sig;
    for (auto* p : getParts()) sig << "p:" << p->getTrackName() << ";";
    for (auto* b : getBeds())  sig << "b:" << b->getTrackName() << ";";
    return sig;
}

void RetrackSession::writeCaptureLog (const juce::String& outcome) const
{
    // What each copy saw when play started. Kept next to the captures to explain odd takes.
    juce::String log;
    log << juce::Time::getCurrentTime().toISO8601 (true) << "  " << outcome << "\n\n";
    for (auto* p : getParts()) log << p->describeFirstBlocks() << "\n";
    for (auto* b : getBeds())  log << b->describeFirstBlocks() << "\n";
    capturesFolder().createDirectory();
    capturesFolder().getChildFile ("last-capture-log.txt").replaceWithText (log);
}

void RetrackSession::setPhase (Phase p)
{
    phase = p;
    sendChangeMessage();
}

void RetrackSession::timerCallback()
{
    // Copies added, removed, renamed or switched role: refresh the checklists.
    auto sig = membersSignature();
    if (sig != lastMembersSignature)
    {
        lastMembersSignature = sig;

        // A copy added, removed or renamed after Arm: arm again with the new set of tracks,
        // or stop a capture that's already running, since its loops no longer match.
        if (phase == Phase::armed)
        {
            if (whyNotReady().isEmpty())
                arm();
            else
                disarm();
            return;
        }
        if (phase == Phase::capturing)
        {
            for (auto* p : getParts()) p->closeTake();
            for (auto* b : getBeds())  b->closeTake();
            failureText = "A track with Retrack was added, removed or renamed while capturing. Arm and press play to try again.";
            writeCaptureLog ("failed: members changed");
            setPhase (Phase::failed);
            return;
        }
        sendChangeMessage();
    }

    if (phase != Phase::armed && phase != Phase::capturing)
        return;

    juce::Array<RetrackProcessor*> all = getParts();
    all.addArray (getBeds());

    for (auto* m : all)
        m->checkForStall();

    bool anyRecording = false, allDone = ! all.isEmpty();
    CaptureClock::Failure failure = CaptureClock::Failure::none;
    for (auto* m : all)
    {
        auto s = m->getClockState();
        anyRecording = anyRecording || s == CaptureClock::State::recording;
        allDone = allDone && s == CaptureClock::State::done;
        if (s == CaptureClock::State::failed)
            failure = m->getClockFailure();
    }

    if (failure != CaptureClock::Failure::none)
    {
        for (auto* m : all) m->closeTake();
        switch (failure)
        {
            case CaptureClock::Failure::stoppedEarly:  failureText = "Playback stopped before every loop finished. Arm and press play to try again."; break;
            case CaptureClock::Failure::playheadMoved: failureText = "The playhead moved or Cycle changed while capturing. Arm and press play to try again."; break;
            case CaptureClock::Failure::tooShort:      failureText = "That was shorter than 5 seconds. Arm and play a longer section."; break;
            case CaptureClock::Failure::needsCycle:
            case CaptureClock::Failure::none:          break;
        }
        writeCaptureLog ("failed: " + failureText);
        setPhase (Phase::failed);
        return;
    }

    if (allDone)
    {
        auto beds = getBeds();
        take.seconds = beds[0]->getTotalSeconds() / juce::jmax (1, take.partNames.size());
        take.bpm = beds[0]->getLastBpm();
        take.timeSigNum = beds[0]->getTimeSigNumerator();
        take.timeSigDen = beds[0]->getTimeSigDenominator();
        for (auto* m : all) m->closeTake(); // flushes every file
        writeCaptureLog ("captured");
        setPhase (Phase::captured);
        return;
    }

    if (anyRecording && phase == Phase::armed)
        setPhase (Phase::capturing);
    else if (phase == Phase::capturing)
        sendChangeMessage(); // progress
    else if (phase == Phase::armed)
        sendChangeMessage(); // e.g. "turn on Cycle"
}
