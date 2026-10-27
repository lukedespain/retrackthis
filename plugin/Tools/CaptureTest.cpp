// Runs Retrack's capture the way Logic drives it, with no DAW: 4 Part copies, a
// Bed copy fed by the sum of their outputs plus an extra track, cycle on, loop
// wraps landing mid-block, and the stale first block Logic gave the Stereo Out
// copy in the probe test. Then checks every part file is exactly its track and
// every bed is exactly the song minus that part. Exit code 0 = all passed.

#include <JuceHeader.h>
#include "../Source/PluginProcessor.h"

namespace
{
    constexpr double sr = 48000.0, bpm = 108.0;
    constexpr int block = 2048;
    const double spp = sr * 60.0 / bpm; // samples per quarter note

    struct Head : juce::AudioPlayHead
    {
        PositionInfo info;
        juce::Optional<PositionInfo> getPosition() const override { return info; }
    };

    float source (int track, juce::int64 t)
    {
        const double f[] = { 110.0, 233.0, 347.0, 521.0, 61.0 }; // 4 parts + an extra "bass" track
        return (float) (0.15 * std::sin (juce::MathConstants<double>::twoPi * f[track] * (double) t / sr));
    }

    int failures = 0;
    void check (bool ok, const juce::String& what)
    {
        std::cout << (ok ? "  ok    " : "  FAIL  ") << what << "\n";
        if (! ok) ++failures;
    }

    juce::AudioBuffer<float> readWav (const juce::File& f)
    {
        juce::WavAudioFormat wav;
        std::unique_ptr<juce::AudioFormatReader> r (wav.createReaderFor (new juce::FileInputStream (f), true));
        if (r == nullptr) return {};
        juce::AudioBuffer<float> b ((int) r->numChannels, (int) r->lengthInSamples);
        r->read (&b, 0, (int) r->lengthInSamples, 0, true, true);
        return b;
    }

    enum class Stale { none, extraBlock, replacesFirst };

    /** One run: nParts parts, loop [0, loopPpq), playback starting at startPpq.
        Stale::replacesFirst is what Logic did in real use: the Stereo Out copy's first
        block has the real audio but the old playhead position. */
    void run (const juce::String& name, int nParts, double loopPpq, double startPpq, Stale stale,
              int loopsToPlay, bool cycleOn)
    {
        std::cout << name << "\n";
        juce::OwnedArray<RetrackProcessor> parts;
        for (int i = 0; i < nParts; ++i)
        {
            auto* p = parts.add (new RetrackProcessor());
            juce::AudioProcessor::TrackProperties props;
            props.name = "Track" + juce::String (i + 1);
            p->updateTrackProperties (props);
            p->prepareToPlay (sr, block);
        }
        RetrackProcessor bed;
        juce::AudioProcessor::TrackProperties outProps;
        outProps.name = "Stereo Out";
        bed.updateTrackProperties (outProps);
        bed.prepareToPlay (sr, block);

        auto& session = bed.getSession();
        check (session.whyNotReady().isEmpty(), "ready to arm (" + session.whyNotReady() + ")");
        check (session.arm(), "armed");

        Head head;
        for (auto* p : parts) p->setPlayHead (&head);
        bed.setPlayHead (&head);

        const double loopEndSamples = loopPpq * spp;
        juce::int64 pos = (juce::int64) std::llround (startPpq * spp);
        juce::int64 playedLoopSamples = 0;
        const juce::int64 toPlay = (juce::int64) (loopEndSamples * loopsToPlay) + 3 * block;
        bool firstBlock = true;

        auto blockAt = [&] (juce::int64 p, bool playing)
        {
            head.info = {};
            head.info.setIsPlaying (playing);
            head.info.setIsLooping (cycleOn);
            head.info.setBpm (bpm);
            head.info.setTimeSignature (juce::AudioPlayHead::TimeSignature { 4, 4 });
            head.info.setLoopPoints (juce::AudioPlayHead::LoopPoints { 0.0, loopPpq });
            head.info.setPpqPosition ((double) p / spp);
            head.info.setTimeInSamples (p);
        };

        juce::MidiBuffer midi;
        while (playedLoopSamples < toPlay)
        {
            // Logic wraps on the first sample at or after the loop end, mid-block.
            const int wrap = cycleOn ? (int) std::ceil (loopEndSamples - (double) pos - 1.0e-9) : block + 1;
            juce::AudioBuffer<float> mix (2, block);
            mix.clear();

            for (int i = 0; i < nParts; ++i)
            {
                juce::AudioBuffer<float> buf (2, block);
                for (int s = 0; s < block; ++s)
                {
                    const juce::int64 t = s < wrap ? pos + s : (s - wrap);
                    buf.setSample (0, s, source (i, t));
                    buf.setSample (1, s, source (i, t));
                }
                blockAt (pos, true);
                parts[i]->processBlock (buf, midi);
                for (int c = 0; c < 2; ++c) mix.addFrom (c, 0, buf, c, 0, block);
            }
            for (int s = 0; s < block; ++s) // an extra track with no Retrack on it
            {
                const juce::int64 t = s < wrap ? pos + s : (s - wrap);
                mix.addSample (0, s, source (4, t));
                mix.addSample (1, s, source (4, t));
            }

            if (firstBlock && stale == Stale::extraBlock)
            {
                juce::AudioBuffer<float> junk (2, block);
                junk.clear();
                blockAt ((juce::int64) (583.6 * spp), true); // the old playhead position
                bed.processBlock (junk, midi);
            }
            blockAt (firstBlock && stale == Stale::replacesFirst ? (juce::int64) (583.6 * spp) : pos, true);
            bed.processBlock (mix, midi);
            firstBlock = false;

            pos = wrap <= block ? (juce::int64) (block - wrap) : pos + block;
            playedLoopSamples += block;
        }

        // Stop.
        juce::AudioBuffer<float> silence (2, block);
        silence.clear();
        blockAt (pos, false);
        for (auto* p : parts) p->processBlock (silence, midi);
        bed.processBlock (silence, midi);

        juce::MessageManager::getInstance()->runDispatchLoopUntil (400); // the session's timer wraps up

        const bool shouldFinish = loopsToPlay >= nParts + (startPpq > 0.0 ? 1 : 0) || ! cycleOn;
        check ((session.getPhase() == RetrackSession::Phase::captured) == shouldFinish,
               "phase " + juce::String ((int) session.getPhase()) + (shouldFinish ? " (expect captured)" : " (expect not captured)"));
        if (! shouldFinish)
        {
            check (session.getPhase() == RetrackSession::Phase::failed, "failed with: " + session.getFailureText());
            session.disarm();
            return;
        }

        auto& take = session.getTake();
        check (take.partFiles.size() == nParts && take.bedFiles.size() == nParts, "one part and one bed file per track");
        const double loopLen = loopEndSamples;
        check (std::abs (take.seconds - (cycleOn ? loopLen / sr : take.seconds)) < 0.01,
               "length " + juce::String (take.seconds, 3) + "s");

        for (int k = 0; k < nParts; ++k)
        {
            auto part = readWav (take.partFiles[k]);
            auto bedK = readWav (take.bedFiles[k]);
            check (part.getNumSamples() == bedK.getNumSamples() && part.getNumSamples() > 0,
                   "part " + juce::String (k + 1) + " and its bed are the same length (" + juce::String (part.getNumSamples()) + ")");

            double partErr = 0, bedErr = 0;
            for (int s = 0; s < part.getNumSamples(); ++s)
            {
                const juce::int64 t = cycleOn ? s : (juce::int64) std::llround (startPpq * spp) + s;
                partErr = juce::jmax (partErr, (double) std::abs (part.getSample (0, s) - source (k, t)));
                float expected = source (4, t);
                for (int j = 0; j < nParts; ++j)
                    if (j != k) expected += source (j, t);
                bedErr = juce::jmax (bedErr, (double) std::abs (bedK.getSample (1, s) - expected));
            }
            check (partErr < 1.0e-6, "part " + juce::String (k + 1) + " is exactly its track (max error " + juce::String (partErr, 9) + ")");
            check (bedErr < 1.0e-6, "bed " + juce::String (k + 1) + " is the song minus part " + juce::String (k + 1)
                                    + " (max error " + juce::String (bedErr, 9) + ")");
        }
        session.clearTake();
    }
}

int main()
{
    juce::ScopedJuceInitialiser_GUI gui;
    // Loops of 8 quarter notes at 108 BPM = 213333.33 samples, so wraps land mid-block.
    run ("4 parts, cycle on, start at the loop start, extra stale Bed block", 4, 8.0, 0.0, Stale::extraBlock, 4, true);
    run ("4 parts, the Bed's first block has a stale playhead (seen in Logic)", 4, 8.0, 0.0, Stale::replacesFirst, 4, true);
    run ("3 parts, play starts a little before the loop (pre-roll)", 3, 8.0, -0.03, Stale::none, 3, true);
    run ("2 parts, start mid-loop (waits for the wrap)", 2, 8.0, 3.3, Stale::none, 3, true);
    run ("3 parts, stopped after 2 loops (should fail cleanly)", 3, 8.0, 0.0, Stale::none, 2, true);
    run ("1 part, cycle off, play then stop", 1, 8.0, 4.0, Stale::none, 2, false);

    std::cout << (failures == 0 ? "\nALL PASSED\n" : "\nFAILURES: " + juce::String (failures) + "\n");
    return failures == 0 ? 0 : 1;
}
