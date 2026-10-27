#include "WorkspaceView.h"
#include "PluginProcessor.h"

using namespace brand;

namespace
{
    constexpr float headerH = 56.0f;
    constexpr float pad = 18.0f;
    constexpr float leftW = 200.0f;
    constexpr float gap = 10.0f;

    const juce::Colour red { 0xffe5484d };
    const juce::Colour green { 0xff1f9d6b };

    juce::String utf8 (const char* s) { return juce::String (juce::CharPointer_UTF8 (s)); }

    float drawText (juce::Graphics& g, const juce::String& text, juce::Font f, juce::Colour c,
                    juce::Rectangle<float> area, juce::Justification j = juce::Justification::topLeft, float spacing = 1.2f)
    {
        juce::AttributedString as;
        as.setJustification (j);
        as.setLineSpacing (spacing);
        as.append (text, f, c);
        juce::TextLayout tl;
        tl.createLayout (as, area.getWidth());
        tl.draw (g, area.withHeight (tl.getHeight()));
        return area.getY() + tl.getHeight();
    }

    enum class Mark { todo, now, done };

    /** One checklist row: a numbered circle (or a check) and a label, with an optional grey line under it. */
    float drawRow (juce::Graphics& g, juce::Rectangle<float> area, Mark mark, const juce::String& number,
                   const juce::String& label, const juce::String& sub = {})
    {
        auto dot = juce::Rectangle<float> (18.0f, 18.0f).withPosition (area.getX(), area.getY() + 1.0f);
        if (mark == Mark::done)
        {
            g.setColour (green);
            g.fillEllipse (dot);
            juce::Path tick;
            tick.startNewSubPath (dot.getX() + 5.0f, dot.getCentreY() + 0.5f);
            tick.lineTo (dot.getCentreX() - 1.0f, dot.getBottom() - 5.5f);
            tick.lineTo (dot.getRight() - 4.5f, dot.getY() + 5.5f);
            g.setColour (juce::Colours::white);
            g.strokePath (tick, juce::PathStrokeType (1.8f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        }
        else if (mark == Mark::now)
        {
            g.setColour (ink);
            g.fillEllipse (dot);
            g.setColour (juce::Colours::white);
            g.setFont (font (11.0f, Weight::semibold));
            g.drawText (number, dot, juce::Justification::centred, false);
        }
        else
        {
            g.setColour (juce::Colour (0xffd6d4cd));
            g.drawEllipse (dot.reduced (0.75f), 1.5f);
            g.setColour (juce::Colour (0xffa3a19a));
            g.setFont (font (11.0f, Weight::semibold));
            g.drawText (number, dot, juce::Justification::centred, false);
        }

        auto text = area.withTrimmedLeft (28.0f);
        const auto colour = mark == Mark::todo ? juce::Colour (0xffa3a19a) : mark == Mark::done ? muted : ink;
        auto y = drawText (g, label, font (13.5f, mark == Mark::now ? Weight::semibold : Weight::regular), colour,
                           text.withTrimmedTop (1.0f));
        if (sub.isNotEmpty())
            y = drawText (g, sub, font (11.5f), muted, text.withY (y + 1.0f));
        return y + 12.0f;
    }

    juce::String money (int usd) { return "$" + juce::String (usd); }

    const char* keyRoots[][2] = { { "C", "C" }, { "C#", "C\xe2\x99\xaf / D\xe2\x99\xad" }, { "D", "D" },
                                  { "Eb", "E\xe2\x99\xad / D\xe2\x99\xaf" }, { "E", "E" }, { "F", "F" },
                                  { "F#", "F\xe2\x99\xaf / G\xe2\x99\xad" }, { "G", "G" },
                                  { "Ab", "A\xe2\x99\xad / G\xe2\x99\xaf" }, { "A", "A" },
                                  { "Bb", "B\xe2\x99\xad / A\xe2\x99\xaf" }, { "B", "B" } };
    const int dueOptions[] = { 3, 5, 7, 10, 14, 21, 30 };

    visuals::MixerPicture::Strip strip (const juce::String& name, bool isOutput, bool hasRetrack,
                                        bool target = false, bool dim = false)
    {
        visuals::MixerPicture::Strip s;
        s.name = name;
        s.isOutput = isOutput;
        s.hasRetrack = hasRetrack;
        s.target = target;
        s.dim = dim;
        return s;
    }

    juce::File introMarker()
    {
        return juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
            .getChildFile ("Application Support/RetrackThis/Retrack/seen-intro");
    }
}

//==============================================================================
WorkspaceView::WorkspaceView (RetrackProcessor& p, RetrackAccount& a)
    : proc (p), session (p.getSession()), account (a)
{
    lnf = std::make_unique<brand::LookAndFeel>();
    setLookAndFeel (lnf.get());

    for (auto* c : std::initializer_list<juce::Component*> { &mixer, &cycle, &light, &armButton, &disarmButton, &retryButton,
                                                             &postButton, &recaptureButton, &filesButton, &payAgainButton,
                                                             &newCaptureButton, &gotItButton, &titleEditor, &notesEditor,
                                                             &budgetEditor, &instrumentBox, &dueBox, &keyBox, &testToggle })
        addChildComponent (c);

    titleEditor.setTextToShowWhenEmpty ("Song title", muted);
    notesEditor.setTextToShowWhenEmpty ("What should the musician play? Style, feel, references.", muted);
    notesEditor.setMultiLine (true, true);
    notesEditor.setReturnKeyStartsNewLine (true);
    budgetEditor.setInputRestrictions (3, "0123456789");
    budgetEditor.setTooltip ("Whole dollars, from $25 to $500. You pay it up front, and the musician is paid when you make the pick.");
    for (auto* ed : { &titleEditor, &notesEditor, &budgetEditor })
    {
        ed->setFont (font (13.0f));
        ed->setIndents (10, ed == &notesEditor ? 8 : 7);
        ed->onTextChange = [this] { storeFormIntoDraft(); repaint(); };
    }
    instrumentBox.setTextWhenNothingSelected ("Instrument");
    keyBox.setTextWhenNothingSelected ("Key (optional)");
    keyBox.addItem ("Not sure", 1);
    int keyItem = 2;
    for (auto& root : keyRoots)
    {
        keyBox.addItem (utf8 (root[1]) + " major", keyItem++);
        keyBox.addItem (utf8 (root[1]) + " minor", keyItem++);
    }
    for (auto d : dueOptions)
        dueBox.addItem (juce::String (d) + " days", d);
    for (auto* box : { &instrumentBox, &dueBox, &keyBox })
        box->onChange = [this] { storeFormIntoDraft(); repaint(); };

    mixer.setTooltip ("In Logic's mixer, click the empty slot under your other plugins and choose "
                      "Audio Units > RetrackThis > Retrack. Select several tracks first to insert it on all of them at once.");
    cycle.setTooltip ("Press C (or click the top of the ruler) to turn on Cycle, then drag the yellow area over the section. "
                      "Retrack plays it once for each track you're retracking, muting a different one each time.");

    armButton.onClick = [this] { session.arm(); };
    disarmButton.onClick = [this] { session.disarm(); };
    retryButton.onClick = [this] { session.rearm(); };
    recaptureButton.onClick = [this] { drafts.clear(); session.clearTake(); };
    filesButton.onClick = [this] { session.getTake().folder.startAsProcess(); };
    payAgainButton.onClick = [this] { openPaymentPage(); };
    newCaptureButton.onClick = [this] { drafts.clear(); postResult = {}; session.clearTake(); screen = Screen::setup; refresh(); };
    gotItButton.onClick = [this] { showingIntro = false; introMarker().create(); refresh(); };
    postButton.onClick = [this]
    {
        storeFormIntoDraft();
        if (! draftComplete (drafts[selected]) || selected < drafts.size() - 1)
        {
            // "Next: Keys" moves on once this one is filled in.
            if (draftComplete (drafts[selected]) && selected < drafts.size() - 1)
                selectDraft (selected + 1);
            else
                formError = firstProblem();
            repaint();
            return;
        }
        post();
    };

    showingIntro = ! introMarker().existsAsFile();
    session.addChangeListener (this);
    account.addChangeListener (this);
    startTimerHz (10);
    refresh();
}

WorkspaceView::~WorkspaceView()
{
    session.removeChangeListener (this);
    account.removeChangeListener (this);
    setLookAndFeel (nullptr);
}

void WorkspaceView::changeListenerCallback (juce::ChangeBroadcaster*) { refresh(); }

void WorkspaceView::timerCallback()
{
    if (screen == Screen::capturing || screen == Screen::posting)
        repaint();
}

WorkspaceView::Step WorkspaceView::currentStep() const
{
    const int parts = previewMode ? preview.parts.size() : session.getParts().size();
    const bool bed = previewMode ? preview.hasBed : session.getBeds().size() == 1;
    if (parts == 0) return Step::insertParts;
    if (! bed) return Step::insertBed;
    return screen == Screen::armed ? Step::play : Step::arm;
}

void WorkspaceView::refresh()
{
    if (! previewMode && screen != Screen::posting && screen != Screen::posted)
    {
        switch (session.getPhase())
        {
            case RetrackSession::Phase::setup:     screen = Screen::setup; break;
            case RetrackSession::Phase::armed:     screen = Screen::armed; break;
            case RetrackSession::Phase::capturing: screen = Screen::capturing; break;
            case RetrackSession::Phase::failed:    screen = Screen::failed; break;
            case RetrackSession::Phase::captured:
                if (screen != Screen::jobs) enterJobs();
                screen = Screen::jobs;
                break;
        }
    }
    layoutRight();
    repaint();
}

//==============================================================================
juce::Rectangle<float> WorkspaceView::leftCard() const
{
    return { pad, headerH + 4.0f, leftW, (float) getHeight() - headerH - 4.0f - pad };
}

juce::Rectangle<float> WorkspaceView::rightCard() const
{
    auto l = leftCard();
    return { l.getRight() + gap, l.getY(), (float) getWidth() - pad - l.getRight() - gap, l.getHeight() };
}

juce::Rectangle<float> WorkspaceView::chipArea() const
{
    auto state = account.getState();
    auto w = 28.0f + 8.0f + juce::GlyphArrangement::getStringWidth (font (13.0f, Weight::medium), state.name) + 14.0f;
    return { (float) getWidth() - pad - w, (headerH - 34.0f) / 2.0f + 4.0f, w, 34.0f };
}

juce::Rectangle<float> WorkspaceView::helpArea() const
{
    auto chip = chipArea();
    return { chip.getX() - 8.0f - 30.0f, chip.getCentreY() - 15.0f, 30.0f, 30.0f };
}

juce::Rectangle<float> WorkspaceView::trackArea() const
{
    auto x = pad + 34.0f + juce::GlyphArrangement::getStringWidth (font (17.0f, Weight::semibold), "RetrackThis") + 8.0f;
    return { x, headerH / 2.0f + 4.0f - 12.0f, helpArea().getX() - x - 8.0f, 24.0f };
}

void WorkspaceView::paintHeader (juce::Graphics& g)
{
    auto y = headerH / 2.0f + 4.0f;
    drawBadge (g, { pad, y - 13.0f, 26.0f, 26.0f });
    drawWordmark (g, { pad + 34.0f, y + 6.0f }, 17.0f);

    // Which copy this window belongs to, and its role. Click to change the role.
    if (! previewMode || preview.parts.size() > 0)
    {
        auto name = previewMode ? preview.parts[0] : proc.getTrackName();
        if (name.isEmpty()) name = "This track";
        const bool bed = previewMode ? false : proc.isBed();
        auto label = utf8 ("\xc2\xb7 ") + name + "  " + (bed ? "Bed" : "Part") + utf8 (" \xe2\x96\xbe");
        g.setColour (muted);
        g.setFont (font (13.5f));
        g.drawText (label, trackArea(), juce::Justification::centredLeft, true);
    }

    auto help = helpArea();
    g.setColour (surface);
    g.fillEllipse (help);
    g.setColour (line);
    g.drawEllipse (help.reduced (0.5f), 1.0f);
    g.setColour (muted);
    g.setFont (font (14.0f, Weight::semibold));
    g.drawText ("?", help, juce::Justification::centred, false);

    auto state = account.getState();
    auto chip = chipArea();
    g.setColour (chipHover ? soft.darker (0.03f) : surface);
    g.fillRoundedRectangle (chip, chip.getHeight() / 2.0f);
    g.setColour (line);
    g.drawRoundedRectangle (chip.reduced (0.5f), chip.getHeight() / 2.0f, 1.0f);
    drawAvatar (g, { chip.getX() + 3.0f, chip.getY() + 3.0f, 28.0f, 28.0f }, state.name, state.avatarSvg);
    g.setColour (ink);
    g.setFont (font (13.0f, Weight::medium));
    g.drawText (state.name, chip.withTrimmedLeft (39.0f).withTrimmedRight (10.0f), juce::Justification::centredLeft, true);
}

void WorkspaceView::paint (juce::Graphics& g)
{
    g.fillAll (page);
    paintHeader (g);

    const bool hot = screen == Screen::armed || screen == Screen::capturing;
    auto left = leftCard(), right = rightCard();
    drawCard (g, left, 14.0f);
    drawCard (g, right, 14.0f);
    if (hot)
    {
        g.setColour (red.withAlpha (0.8f));
        g.drawRoundedRectangle (left.reduced (0.5f), 14.0f, 1.2f);
        g.drawRoundedRectangle (right.reduced (0.5f), 14.0f, 1.2f);
    }

    auto inner = left.reduced (16.0f);
    switch (screen)
    {
        case Screen::setup:
        case Screen::armed:
        case Screen::failed:    paintChecklist (g, inner); break;
        case Screen::capturing: paintLoops (g, inner); break;
        case Screen::jobs:
        case Screen::posting:
        case Screen::posted:    paintJobList (g, inner); break;
    }
    if (showingIntro)
        paintIntro (g);
    else
        paintRight (g, right);
}

void WorkspaceView::paintChecklist (juce::Graphics& g, juce::Rectangle<float> area)
{
    auto names = previewMode ? preview.parts : session.getPartNames();
    const bool bed = previewMode ? preview.hasBed : session.getBeds().size() == 1;
    const int beds = previewMode ? (preview.hasBed ? 1 : 0) : session.getBeds().size();
    const bool armed = screen == Screen::armed;

    juce::String partsSub = names.isEmpty() ? juce::String() : names.joinIntoString (", ");
    if (names.size() > 8) partsSub = "Up to 8 tracks per project";
    juce::String bedSub = beds > 1 ? "Keep just one, on the Stereo Out" : juce::String();

    float y = area.getY();
    auto row = [&] (Mark m, const char* n, const juce::String& label, const juce::String& sub = {})
    {
        y = drawRow (g, area.withY (y), m, n, label, sub);
    };
    row (names.isEmpty() ? Mark::now : Mark::done, "1", "Insert on tracks to retrack", partsSub);
    row (names.isEmpty() ? Mark::todo : (bed ? Mark::done : Mark::now), "2", "Insert on Stereo Out", bedSub);
    row (armed ? Mark::done : (! names.isEmpty() && bed ? Mark::now : Mark::todo), "3", "Click Arm");
    row (armed ? Mark::now : Mark::todo, "4", "Press play");
}

void WorkspaceView::paintLoops (juce::Graphics& g, juce::Rectangle<float> area)
{
    auto names = previewMode ? preview.parts : session.getTake().partNames;
    const int pass = previewMode ? 1 : session.getCurrentPass();
    const bool cycleOff = ! previewMode && names.size() == 1 && ! proc.isLoopingNow();

    float y = area.getY();
    if (cycleOff)
    {
        y = drawRow (g, area.withY (y), Mark::now, "1", "Recording " + names[0],
                     juce::String (session.getSecondsInPass(), 1) + "s");
        drawText (g, "Stop playback when the section is done.", font (12.0f), muted,
                  area.withTop (area.getBottom() - 34.0f));
        return;
    }

    for (int i = 0; i < names.size(); ++i)
    {
        juce::String sub;
        if (i == pass)
        {
            const double secs = previewMode ? 14.0 : session.getSecondsInPass();
            const double total = previewMode ? 32.0 : proc.getLoopSeconds();
            sub = juce::String ((int) secs / 60) + ":" + juce::String ((int) secs % 60).paddedLeft ('0', 2)
                  + " of " + juce::String ((int) total / 60) + ":" + juce::String ((int) total % 60).paddedLeft ('0', 2);
        }
        y = drawRow (g, area.withY (y), i < pass ? Mark::done : i == pass ? Mark::now : Mark::todo,
                     juce::String (i + 1), "Loop " + juce::String (i + 1) + ": " + names[i], sub);
    }
    drawText (g, "Keep playing. Retrack stops by itself after the last loop.", font (12.0f), muted,
              area.withTop (area.getBottom() - 34.0f));
}

void WorkspaceView::paintJobList (juce::Graphics& g, juce::Rectangle<float> area)
{
    jobRowAreas.clear();
    float y = area.getY() - 4.0f;
    for (int i = 0; i < drafts.size(); ++i)
    {
        auto r = juce::Rectangle<float> (area.getX() - 6.0f, y, area.getWidth() + 12.0f, 34.0f);
        jobRowAreas.add (r);
        const bool on = i == selected && screen == Screen::jobs;
        if (on)
        {
            g.setColour (accentSoft);
            g.fillRoundedRectangle (r, 8.0f);
        }
        const bool complete = draftComplete (drafts[i]) && titleEditor.getText().trim().isNotEmpty();
        drawRow (g, r.reduced (6.0f, 8.0f), complete || screen == Screen::posted ? Mark::done : (on ? Mark::now : Mark::todo),
                 juce::String (i + 1), drafts[i].trackName);
        auto budget = drafts[i].budget.getIntValue();
        if (budget > 0)
        {
            g.setColour (on ? accentInk : muted);
            g.setFont (font (13.0f));
            g.drawText (money (budget), r.reduced (8.0f, 0.0f), juce::Justification::centredRight, false);
        }
        y += 38.0f;
    }

    auto& take = session.getTake();
    const double bpm = previewMode ? 92.0 : take.bpm;
    const double secs = previewMode ? 32.0 : take.seconds;
    auto meta = juce::String (juce::roundToInt (bpm)) + " BPM" + utf8 (" \xc2\xb7 ")
                + juce::String (previewMode ? 4 : take.timeSigNum) + "/" + juce::String (previewMode ? 4 : take.timeSigDen)
                + utf8 (" \xc2\xb7 ") + juce::String ((int) secs / 60) + ":" + juce::String ((int) secs % 60).paddedLeft ('0', 2);
    g.setColour (muted);
    g.setFont (font (12.0f));
    g.drawText (meta, area.withTop (area.getBottom() - 62.0f).withHeight (18.0f), juce::Justification::centredLeft, false);
}

void WorkspaceView::paintRight (juce::Graphics& g, juce::Rectangle<float> card)
{
    auto inner = card.reduced (16.0f);
    switch (screen)
    {
        case Screen::setup:
        {
            auto step = currentStep();
            if (step == Step::insertParts || step == Step::insertBed)
            {
                auto caption = step == Step::insertParts ? "Insert Retrack last on each track you want retracked."
                                                         : "Insert Retrack last on the Stereo Out, after your limiter and meter.";
                drawText (g, caption, font (12.5f), muted, inner.withTop ((float) mixer.getBottom() + 10.0f), juce::Justification::centredTop);
            }
            else
            {
                const int parts = previewMode ? preview.parts.size() : session.getParts().size();
                auto caption = parts > 1 ? "Turn on Cycle over the section. With " + juce::String (parts)
                                               + " tracks, Retrack plays it " + juce::String (parts) + " times."
                                         : juce::String ("Retrack records one pass. Cycle is optional.");
                if (parts > 1)
                    drawText (g, caption, font (12.5f), muted, inner.withTop ((float) cycle.getBottom() + 10.0f), juce::Justification::centredTop);
                else
                    drawText (g, caption, font (12.5f), muted, inner.withTop ((float) armButton.getBottom() + 14.0f), juce::Justification::centredTop);
            }
            break;
        }
        case Screen::armed:
        {
            auto y = (float) light.getBottom() + 14.0f;
            auto w = juce::GlyphArrangement::getStringWidth (font (14.0f, Weight::semibold), "Press play") + 10.0f + 58.0f;
            auto x = card.getCentreX() - w / 2.0f;
            g.setColour (ink);
            g.setFont (font (14.0f, Weight::semibold));
            g.drawText ("Press play", juce::Rectangle<float> (x, y, w - 58.0f, 22.0f), juce::Justification::centredLeft, false);
            visuals::drawKey (g, { x + w - 58.0f, y }, "space");
            if (! previewMode && session.cycleWasOff())
                drawText (g, "Turn on Cycle first, then press play again.", font (12.5f, Weight::medium), red,
                          inner.withTop (y + 36.0f), juce::Justification::centredTop);
            else
                drawText (g, "Retrack records the next time you press play.", font (12.5f), muted,
                          inner.withTop (y + 36.0f), juce::Justification::centredTop);
            break;
        }
        case Screen::capturing:
        {
            auto names = previewMode ? preview.parts : session.getTake().partNames;
            const int pass = previewMode ? 1 : session.getCurrentPass();
            const double loopSecs = previewMode ? 32.0 : juce::jmax (0.1, proc.getLoopSeconds());
            const double secs = previewMode ? 14.0 : session.getSecondsInPass();
            const bool cycleOff = ! previewMode && names.size() == 1 && ! proc.isLoopingNow();

            drawText (g, "Each musician gets their part, plus a bed with everything except that part.",
                      font (12.0f), muted, inner);
            float y = inner.getY() + 46.0f;
            const float nameW = 62.0f, colW = (inner.getWidth() - nameW - 8.0f) / 2.0f;
            g.setColour (muted);
            g.setFont (font (11.5f, Weight::medium));
            g.drawText ("Part", juce::Rectangle<float> (inner.getX() + nameW, y, colW, 16.0f), juce::Justification::centredLeft, false);
            g.drawText ("Bed", juce::Rectangle<float> (inner.getX() + nameW + colW + 8.0f, y, colW, 16.0f), juce::Justification::centredLeft, false);
            y += 20.0f;
            for (int i = 0; i < names.size() && y < inner.getBottom() - 30.0f; ++i)
            {
                float fill = i < pass ? 1.0f : i == pass ? (float) juce::jlimit (0.0, 1.0, cycleOff ? 0.5 : secs / loopSecs) : 0.0f;
                g.setColour (ink);
                g.setFont (font (13.0f, Weight::medium));
                g.drawText (names[i], juce::Rectangle<float> (inner.getX(), y, nameW - 6.0f, 28.0f), juce::Justification::centredLeft, true);
                for (int col = 0; col < 2; ++col)
                {
                    auto bar = juce::Rectangle<float> (inner.getX() + nameW + (colW + 8.0f) * (float) col, y, colW, 28.0f);
                    g.setColour (i == pass ? accent.withAlpha (0.08f) : soft);
                    g.fillRoundedRectangle (bar, 7.0f);
                    if (fill > 0.0f)
                    {
                        auto filled = bar.reduced (5.0f, 8.0f).withWidth ((bar.getWidth() - 10.0f) * fill);
                        // Little waveform ticks.
                        g.setColour (col == 0 ? accent : juce::Colour (0xff9a9aa2));
                        for (float x = filled.getX(); x < filled.getRight(); x += 3.0f)
                        {
                            const float h = filled.getHeight() * (0.35f + 0.65f * std::abs (std::sin (x * 0.37f + (float) i)));
                            g.fillRect (x, filled.getCentreY() - h / 2.0f, 1.6f, h);
                        }
                    }
                    if (i == pass)
                    {
                        g.setColour (accent);
                        g.drawRoundedRectangle (bar.reduced (0.5f), 7.0f, 1.0f);
                    }
                }
                y += 36.0f;
            }
            break;
        }
        case Screen::failed:
            drawText (g, "That capture didn't finish", font (16.0f, Weight::semibold), ink, inner.withTrimmedTop (30.0f),
                      juce::Justification::centredTop);
            drawText (g, previewMode ? juce::String ("Playback stopped before every loop finished. Arm and press play to try again.")
                                     : session.getFailureText(),
                      font (13.0f), muted, inner.withTrimmedTop (58.0f).reduced (10.0f, 0.0f), juce::Justification::centredTop, 1.3f);
            break;
        case Screen::jobs:
        {
            auto label = [&] (juce::Component& c, const juce::String& text)
            {
                g.setColour (muted);
                g.setFont (font (11.5f, Weight::medium));
                g.drawText (text, c.getBounds().toFloat().translated (2.0f, -16.0f).withHeight (14.0f), juce::Justification::centredLeft, false);
            };
            label (titleEditor, "Song");
            label (instrumentBox, drafts.isEmpty() ? juce::String ("Instrument") : "Instrument for " + drafts[selected].trackName);
            label (budgetEditor, "Budget ($)");
            label (dueBox, "Due");
            label (keyBox, "Key");
            label (notesEditor, "Notes for the musician");
            if (formError.isNotEmpty())
            {
                g.setColour (red);
                g.setFont (font (11.5f, Weight::medium));
                g.drawText (formError, juce::Rectangle<float> (inner.getX(), (float) postButton.getY() - 18.0f, inner.getWidth(), 14.0f),
                            juce::Justification::centredRight, true);
            }
            break;
        }
        case Screen::posting:
        {
            auto c = juce::Point<float> (card.getCentreX(), card.getCentreY() - 14.0f);
            auto t = (double) juce::Time::getMillisecondCounter() / 1000.0;
            juce::Path arc;
            arc.addCentredArc (c.x, c.y, 14.0f, 14.0f, (float) (t * juce::MathConstants<double>::twoPi), 0.0f, 4.2f, true);
            g.setColour (accent.withAlpha (0.18f));
            g.drawEllipse (juce::Rectangle<float> (28.0f, 28.0f).withCentre (c), 3.0f);
            g.setColour (accent);
            g.strokePath (arc, juce::PathStrokeType (3.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
            drawText (g, previewMode ? juce::String ("Uploading Keys (2 of 2)") : postProgress, font (13.5f, Weight::medium), ink,
                      inner.withTop (c.y + 28.0f), juce::Justification::centredTop);
            break;
        }
        case Screen::posted:
        {
            const bool test = previewMode ? false : postResult.isTest;
            auto icon = juce::Rectangle<float> (44.0f, 44.0f).withCentre ({ card.getCentreX(), inner.getY() + 34.0f });
            g.setColour (test ? juce::Colour (0xffe3f4ec) : accentSoft);
            g.fillEllipse (icon);
            g.setColour (test ? green : accentInk);
            g.setFont (font (20.0f, Weight::semibold));
            g.drawText (test ? utf8 ("\xe2\x9c\x93") : juce::String ("$"), icon, juce::Justification::centred, false);
            const int n = previewMode ? 2 : drafts.size();
            int total = 0;
            for (auto& d : drafts) total += d.budget.getIntValue();
            auto y = drawText (g, test ? juce::String ("Your test jobs are live") : juce::String ("Finish payment in your browser"),
                               font (16.0f, Weight::semibold), ink, inner.withTop (icon.getBottom() + 12.0f), juce::Justification::centredTop);
            drawText (g, test ? "They're on RetrackThis now, marked as tests. Nothing was charged."
                              : (n > 1 ? "Your " + juce::String (n) + " jobs go live as soon as you pay " + money (previewMode ? 250 : total) + "."
                                       : "Your job goes live as soon as you pay " + money (previewMode ? 150 : total) + "."),
                      font (13.0f), muted, inner.withTop (y + 6.0f).reduced (8.0f, 0.0f), juce::Justification::centredTop, 1.3f);
            break;
        }
    }
}

void WorkspaceView::paintIntro (juce::Graphics& g)
{
    auto area = getLocalBounds().toFloat().withTrimmedTop (headerH + 4.0f).reduced (pad, 0.0f).withTrimmedBottom (pad);
    g.setColour (page);
    g.fillRect (area.expanded (pad, 0.0f).withBottom ((float) getHeight()));
    drawCard (g, area, 14.0f);

    auto steps = area.reduced (24.0f).withTop ((float) mixer.getBottom() + 16.0f);
    const char* lines[] = { "Insert this plugin last on each track you want retracked.",
                            "Insert it last on the Stereo Out too.", "Click Arm.", "Press play." };
    auto list = steps.withSizeKeepingCentre (380.0f, steps.getHeight());
    float y = list.getY();
    for (int i = 0; i < 4; ++i)
        y = drawRow (g, list.withY (y), Mark::now, juce::String (i + 1), lines[i]) - 4.0f;
}

//==============================================================================
void WorkspaceView::resized()
{
    layoutRight();
}

void WorkspaceView::layoutRight()
{
    for (auto* c : getChildren())
        c->setVisible (false);

    auto card = rightCard();
    auto inner = card.reduced (16.0f);
    auto centreButton = [&] (juce::Component& b, float y, float w)
    {
        b.setBounds (juce::Rectangle<float> (w, 40.0f).withCentre ({ card.getCentreX(), y + 20.0f }).toNearestInt());
        b.setVisible (true);
    };

    if (showingIntro)
    {
        auto area = getLocalBounds().toFloat().withTrimmedTop (headerH + 4.0f).reduced (pad, 0.0f).withTrimmedBottom (pad).reduced (24.0f);
        juce::Array<visuals::MixerPicture::Strip> strips;
        strips.add (strip ("Drums", false, true));
        strips.add (strip ("Keys", false, true));
        strips.add (strip ("Bass", false, false, false, true));
        strips.add (strip ("Vocal", false, false, false, true));
        strips.add (strip ("Stereo Out", true, true));
        mixer.setStrips (strips);
        mixer.setBounds (area.removeFromTop (128.0f).withSizeKeepingCentre (360.0f, 128.0f).toNearestInt());
        mixer.setVisible (true);
        gotItButton.setBounds (juce::Rectangle<int> ((int) area.getRight() - 130, (int) area.getBottom() - 38, 130, 38));
        gotItButton.setVisible (true);
        return;
    }

    auto names = previewMode ? preview.parts : session.getPartNames();
    switch (screen)
    {
        case Screen::setup:
        {
            auto step = currentStep();
            if (step == Step::insertParts || step == Step::insertBed)
            {
                juce::Array<visuals::MixerPicture::Strip> strips;
                if (step == Step::insertParts)
                {
                    strips.add (strip ("Drums", false, false, true));
                    strips.add (strip ("Keys", false, false, false, true));
                    strips.add (strip ("Bass", false, false, false, true));
                }
                else
                    for (int i = 0; i < juce::jmin (3, names.size()); ++i)
                        strips.add (strip (names[i], false, true));
                const bool hasBed = previewMode ? preview.hasBed : session.getBeds().size() > 0;
                strips.add (strip ("Stereo Out", true, hasBed, step == Step::insertBed));
                mixer.setStrips (strips);
                mixer.setBounds (inner.withHeight (170.0f).toNearestInt());
                mixer.setVisible (true);
            }
            else
            {
                const bool multi = names.size() > 1;
                centreButton (armButton, inner.getY() + (multi ? 18.0f : 70.0f), 180.0f);
                if (multi)
                {
                    cycle.setBounds (inner.withTop ((float) armButton.getBottom() + 28.0f).withHeight (54.0f).toNearestInt());
                    cycle.setVisible (true);
                }
            }
            break;
        }
        case Screen::armed:
            light.setBounds (juce::Rectangle<int> (70, 70).withCentre ({ (int) card.getCentreX(), (int) inner.getY() + 48 }));
            light.setVisible (true);
            centreButton (disarmButton, inner.getBottom() - 40.0f, 140.0f);
            break;
        case Screen::capturing:
            break;
        case Screen::failed:
            centreButton (retryButton, inner.getBottom() - 40.0f, 160.0f);
            break;
        case Screen::jobs:
        {
            if (drafts.isEmpty())
                break;
            auto f = inner;
            auto row = [&] (float h) { f.removeFromTop (16.0f); auto r = f.removeFromTop (h); f.removeFromTop (8.0f); return r; };
            titleEditor.setBounds (row (30.0f).toNearestInt());
            instrumentBox.setBounds (row (30.0f).toNearestInt());
            auto pair = row (30.0f);
            budgetEditor.setBounds (pair.removeFromLeft (pair.getWidth() * 0.38f).toNearestInt());
            pair.removeFromLeft (8.0f);
            auto dueKey = pair;
            dueBox.setBounds (dueKey.removeFromLeft (dueKey.getWidth() * 0.5f - 4.0f).toNearestInt());
            dueKey.removeFromLeft (8.0f);
            keyBox.setBounds (dueKey.toNearestInt());
            notesEditor.setBounds (row (juce::jmax (40.0f, f.getHeight() - 16.0f - 8.0f - 44.0f)).toNearestInt());
            auto bottom = inner.withTop (inner.getBottom() - 36.0f);
            const bool last = selected >= drafts.size() - 1;
            int total = 0;
            for (auto& d : drafts) total += d.budget.getIntValue();
            postButton.setButtonText (! last ? "Next: " + drafts[selected + 1].trackName
                                             : (testToggle.getToggleState() ? (drafts.size() > 1 ? "Post " + juce::String (drafts.size()) + " test jobs" : juce::String ("Post test job"))
                                                                            : "Post " + juce::String (drafts.size()) + (drafts.size() > 1 ? " jobs" : " job")
                                                                                  + utf8 (" \xc2\xb7 ") + money (total)));
            auto pw = juce::GlyphArrangement::getStringWidth (font (14.0f, Weight::medium), postButton.getButtonText()) + 40.0f;
            postButton.setBounds (bottom.removeFromRight (pw).toNearestInt());
            if (account.getState().isAdmin || previewMode)
            {
                testToggle.setBounds (bottom.withTrimmedRight (8.0f).toNearestInt());
                testToggle.setVisible (true);
            }
            for (auto* c : std::initializer_list<juce::Component*> { &titleEditor, &instrumentBox, &budgetEditor, &dueBox, &keyBox, &notesEditor, &postButton })
                c->setVisible (true);
            break;
        }
        case Screen::posting:
            break;
        case Screen::posted:
        {
            const bool test = previewMode ? false : postResult.isTest;
            payAgainButton.setButtonText (test ? "View them on RetrackThis" : "Open payment again");
            centreButton (payAgainButton, inner.getBottom() - 86.0f, 210.0f);
            centreButton (newCaptureButton, inner.getBottom() - 40.0f, 180.0f);
            break;
        }
    }

    if (screen == Screen::jobs)
    {
        auto left = leftCard().reduced (16.0f);
        recaptureButton.setBounds (juce::Rectangle<float> (left.getX() - 8.0f, left.getBottom() - 30.0f, 90.0f, 30.0f).toNearestInt());
        filesButton.setBounds (juce::Rectangle<float> (left.getRight() - 84.0f, left.getBottom() - 30.0f, 90.0f, 30.0f).toNearestInt());
        recaptureButton.setVisible (true);
        filesButton.setVisible (! previewMode);
    }
}

//==============================================================================
void WorkspaceView::mouseMove (const juce::MouseEvent& e)
{
    auto hover = chipArea().contains (e.position) || helpArea().contains (e.position) || trackArea().contains (e.position)
                 || (screen == Screen::jobs && std::any_of (jobRowAreas.begin(), jobRowAreas.end(), [&] (auto& r) { return r.contains (e.position); }));
    setMouseCursor (hover ? juce::MouseCursor::PointingHandCursor : juce::MouseCursor::NormalCursor);
    if (chipArea().contains (e.position) != chipHover)
    {
        chipHover = ! chipHover;
        repaint (chipArea().expanded (4.0f).toNearestInt());
    }
}

void WorkspaceView::mouseUp (const juce::MouseEvent& e)
{
    if (chipArea().contains (e.position))
    {
        juce::PopupMenu menu;
        menu.addSectionHeader (account.getState().name);
        menu.addItem ("Open retrackthis.com", [] { juce::URL (RetrackAccount::baseUrl() + "/producers").launchInDefaultBrowser(); });
        menu.addSeparator();
        menu.addItem ("Sign out", [this] { account.signOut(); });
        menu.showMenuAsync (juce::PopupMenu::Options().withTargetComponent (this)
                                .withTargetScreenArea (localAreaToGlobal (chipArea().toNearestInt())));
        return;
    }
    if (helpArea().contains (e.position))
    {
        showingIntro = true;
        refresh();
        return;
    }
    if (trackArea().contains (e.position) && screen == Screen::setup)
    {
        using Role = RetrackProcessor::Role;
        auto current = proc.getRoleSetting();
        juce::PopupMenu menu;
        menu.addSectionHeader ("What this copy records");
        menu.addItem ("Automatic (Bed on Stereo Out, Part elsewhere)", true, current == Role::automatic,
                      [this] { proc.setRoleSetting (Role::automatic); refresh(); });
        menu.addItem ("Part: this track gets retracked", true, current == Role::part,
                      [this] { proc.setRoleSetting (Role::part); refresh(); });
        menu.addItem ("Bed: records everything else", true, current == Role::bed,
                      [this] { proc.setRoleSetting (Role::bed); refresh(); });
        menu.showMenuAsync (juce::PopupMenu::Options().withTargetComponent (this)
                                .withTargetScreenArea (localAreaToGlobal (trackArea().toNearestInt())));
        return;
    }
    if (screen == Screen::jobs)
        for (int i = 0; i < jobRowAreas.size(); ++i)
            if (jobRowAreas[i].contains (e.position))
            {
                storeFormIntoDraft();
                selectDraft (i);
                return;
            }
}

//==============================================================================
void WorkspaceView::enterJobs()
{
    drafts.clear();
    for (auto& name : session.getTake().partNames)
    {
        Draft d;
        d.trackName = name;
        guessInstrument (d);
        drafts.add (d);
    }
    selected = 0;
    formError = {};
    loadInstruments();
    selectDraft (0);
}

void WorkspaceView::loadInstruments()
{
    if (instrumentsRequested)
        return;
    instrumentsRequested = true;
    juce::WeakReference<WorkspaceView> weak (this);
    juce::Thread::launch ([weak]
    {
        juce::var json;
        if (auto stream = juce::URL (RetrackAccount::baseUrl() + "/api/instruments")
                              .createInputStream (juce::URL::InputStreamOptions (juce::URL::ParameterHandling::inAddress)
                                                      .withConnectionTimeoutMs (10000)))
            json = juce::JSON::parse (stream->readEntireStreamAsString());

        juce::MessageManager::callAsync ([weak, json]
        {
            auto* self = weak.get();
            if (self == nullptr) return;
            self->instruments.clear();
            if (auto* arr = json["available"].getArray())
                for (auto& item : *arr)
                {
                    Instrument ins { item["id"].toString(), item["label"].toString(), {} };
                    if (auto* al = item["aliases"].getArray())
                        for (auto& a : *al) ins.aliases.add (a.toString());
                    if (ins.id.isNotEmpty()) self->instruments.add (ins);
                }
            if (self->instruments.isEmpty())
                self->instrumentsRequested = false; // try again next time
            for (auto& d : self->drafts)
                if (d.instrumentId.isEmpty()) self->guessInstrument (d);
            self->selectDraft (self->selected);
        });
    });
}

void WorkspaceView::guessInstrument (Draft& d)
{
    auto name = d.trackName.toLowerCase();
    // Common track names that don't match an instrument label word for word.
    const char* shortcuts[][2] = { { "drum", "drum-kit" }, { "kit", "drum-kit" }, { "keys", "piano-grand" }, { "piano", "piano-grand" },
                                   { "rhodes", "rhodes-wurlitzer" }, { "wurli", "rhodes-wurlitzer" }, { "synth", "synthesizer" },
                                   { "organ", "hammond-organ" }, { "bass", "bass-guitar-electric" }, { "acoustic", "acoustic-guitar-steel" },
                                   { "guitar", "electric-guitar" }, { "gtr", "electric-guitar" }, { "sax", "saxophone" },
                                   { "horn", "french-horn" }, { "fiddle", "violin" }, { "upright", "double-bass" } };
    juce::String bestId;
    int bestLen = 0;
    for (auto& ins : instruments)
    {
        juce::StringArray words (ins.aliases);
        words.add (ins.label.toLowerCase());
        for (auto& w : words)
            if (w.isNotEmpty() && name.contains (w.toLowerCase()) && w.length() > bestLen)
            {
                bestId = ins.id;
                bestLen = w.length();
            }
    }
    if (bestId.isEmpty())
        for (auto& s : shortcuts)
            if (name.contains (s[0])) { bestId = s[1]; break; }

    for (auto& ins : instruments)
        if (ins.id == bestId) { d.instrumentId = ins.id; d.instrumentLabel = ins.label; return; }
    if (instruments.isEmpty() && bestId.isNotEmpty())
        d.instrumentId = bestId; // label filled in once the list arrives
}

void WorkspaceView::selectDraft (int index)
{
    if (! juce::isPositiveAndBelow (index, drafts.size()))
        return;
    selected = index;
    auto& d = drafts.getReference (index);

    instrumentBox.clear (juce::dontSendNotification);
    for (int i = 0; i < instruments.size(); ++i)
        instrumentBox.addItem (instruments[i].label, i + 1);
    for (int i = 0; i < instruments.size(); ++i)
        if (instruments[i].id == d.instrumentId)
            instrumentBox.setSelectedId (i + 1, juce::dontSendNotification);

    budgetEditor.setText (d.budget, juce::dontSendNotification);
    notesEditor.setText (d.notes, juce::dontSendNotification);
    dueBox.setSelectedId (d.dueDays, juce::dontSendNotification);
    formError = {};
    layoutRight();
    repaint();
}

void WorkspaceView::storeFormIntoDraft()
{
    if (! juce::isPositiveAndBelow (selected, drafts.size()))
        return;
    auto& d = drafts.getReference (selected);
    auto idx = instrumentBox.getSelectedId() - 1;
    if (juce::isPositiveAndBelow (idx, instruments.size()))
    {
        d.instrumentId = instruments[idx].id;
        d.instrumentLabel = instruments[idx].label;
    }
    d.budget = budgetEditor.getText().trim();
    d.notes = notesEditor.getText().trim();
    if (dueBox.getSelectedId() > 0)
        d.dueDays = dueBox.getSelectedId();
    formError = {};
    layoutRight(); // the Post button's total changes with the budget
}

bool WorkspaceView::draftComplete (const Draft& d) const
{
    auto budget = d.budget.getIntValue();
    return d.instrumentId.isNotEmpty() && budget >= 25 && budget <= 500 && d.notes.isNotEmpty();
}

juce::String WorkspaceView::firstProblem() const
{
    if (titleEditor.getText().trim().isEmpty()) return "Add the song title.";
    for (auto& d : drafts)
    {
        if (d.instrumentId.isEmpty()) return "Pick an instrument for " + d.trackName + ".";
        auto b = d.budget.getIntValue();
        if (b < 25 || b > 500) return "Set a budget from $25 to $500 for " + d.trackName + ".";
        if (d.notes.isEmpty()) return "Add notes for " + d.trackName + ".";
    }
    if (session.getTake().seconds < 5.0) return "The section has to be at least 5 seconds. Recapture a longer one.";
    return {};
}

void WorkspaceView::post()
{
    if (auto problem = firstProblem(); problem.isNotEmpty())
    {
        formError = problem;
        repaint();
        return;
    }

    JobPoster::Request r;
    r.baseUrl = RetrackAccount::baseUrl();
    r.token = account.getToken();
    r.postedFrom = RetrackAccount::hostName() == "your DAW" ? juce::String() : RetrackAccount::hostName();
    r.title = titleEditor.getText().trim();
    if (keyBox.getSelectedId() > 1)
    {
        const int k = keyBox.getSelectedId() - 2;
        r.musicalKey = juce::String (keyRoots[k / 2][0]) + (k % 2 == 0 ? "-major" : "-minor");
    }
    auto& take = session.getTake();
    r.bpm = take.bpm;
    r.seconds = take.seconds;
    r.isTest = testToggle.getToggleState() && account.getState().isAdmin;
    for (int i = 0; i < drafts.size(); ++i)
    {
        auto& d = drafts.getReference (i);
        r.jobs.add ({ d.trackName, take.partFiles[i], take.bedFiles[i], d.instrumentId, d.instrumentLabel,
                      d.budget.getIntValue(), d.dueDays, d.notes });
    }

    screen = Screen::posting;
    postProgress = "Getting ready";
    refresh();

    juce::WeakReference<WorkspaceView> weak (this);
    poster.start (r,
                  [weak] (const juce::String& text) { if (auto* s = weak.get()) { s->postProgress = text; s->repaint(); } },
                  [weak] (const JobPoster::Result& result)
                  {
                      auto* s = weak.get();
                      if (s == nullptr) return;
                      s->postResult = result;
                      if (! result.ok)
                      {
                          s->screen = Screen::jobs;
                          s->formError = result.error;
                          if (result.signedOut) s->account.signOut();
                          s->refresh();
                          return;
                      }
                      s->screen = Screen::posted;
                      if (! result.isTest)
                          s->openPaymentPage();
                      s->refresh();
                  });
}

void WorkspaceView::openPaymentPage()
{
    if (postResult.isTest)
        juce::URL (RetrackAccount::baseUrl() + "/producers").launchInDefaultBrowser();
    else if (postResult.firstJobId.isNotEmpty())
        juce::URL (RetrackAccount::baseUrl() + "/producers?pay=" + postResult.firstJobId).launchInDefaultBrowser();
}

//==============================================================================
void WorkspaceView::showPreview (const Preview& p)
{
    previewMode = true;
    preview = p;
    showingIntro = p.screen == "intro";
    if (p.screen == "armed") screen = Screen::armed;
    else if (p.screen == "capturing") screen = Screen::capturing;
    else if (p.screen == "failed") screen = Screen::failed;
    else if (p.screen == "posting" || p.screen == "posted" || p.screen == "jobs")
    {
        screen = p.screen == "jobs" ? Screen::jobs : p.screen == "posting" ? Screen::posting : Screen::posted;
        drafts.clear();
        Draft a; a.trackName = p.parts[0]; a.instrumentId = "drum-kit"; a.instrumentLabel = "Drum kit"; a.budget = "150"; a.notes = "Tight, live feel. Keep the fills simple.";
        drafts.add (a);
        if (p.parts.size() > 1)
        {
            Draft b; b.trackName = p.parts[1]; b.budget = "100";
            drafts.add (b);
        }
        instruments.clear();
        instruments.add ({ "drum-kit", "Drum kit", {} });
        instruments.add ({ "piano-grand", "Piano", {} });
        titleEditor.setText ("Late Night Drive", juce::dontSendNotification);
        keyBox.setSelectedId (2, juce::dontSendNotification);
        selectDraft (0);
    }
    else screen = Screen::setup;
    layoutRight();
    repaint();
}
