#include "Visuals.h"
#include "Brand.h"

namespace visuals
{
    namespace
    {
        // Logic Pro's dark mixer colours.
        const juce::Colour logicBg    { 0xff1e1e20 };
        const juce::Colour stripBg    { 0xff38383b };
        const juce::Colour slotGrey   { 0xff55555a };
        const juce::Colour slotEmpty  { 0xff2c2c2f };
        const juce::Colour stripText  { 0xffe6e6e8 };
        const juce::Colour dimText    { 0xff9a9aa2 };
        const juce::Colour faderTrack { 0xff17171a };
        const juce::Colour trackBlue  { 0xff3a7bd5 };
        const juce::Colour outPink    { 0xffc23bb0 };
        const juce::Colour menuBg     { 0xf2303033 };
        const juce::Colour menuBlue   { 0xff2f6fdc };
        const juce::Colour cycleGold  { 0xfff1c046 };

        constexpr double period = 5.0; // seconds each walkthrough page loops

        float phase (double t, double from, double to)
        {
            return (float) juce::jlimit (0.0, 1.0, (t - from) / (to - from));
        }

        float ease (float x) { return x * x * (3.0f - 2.0f * x); }

        juce::Point<float> glide (juce::Point<float> a, juce::Point<float> b, double t, double from, double to)
        {
            auto k = ease (phase (t, from, to));
            return a + (b - a) * k;
        }

        void slot (juce::Graphics& g, juce::Rectangle<float> r, juce::Colour fill, const juce::String& text,
                   juce::Colour textColour = stripText)
        {
            g.setColour (fill);
            g.fillRoundedRectangle (r, 2.5f);
            if (text.isNotEmpty())
            {
                g.setColour (textColour);
                g.setFont (brand::font (8.0f, brand::Weight::medium));
                g.drawFittedText (text, r.toNearestInt().reduced (2, 0), juce::Justification::centred, 1, 0.75f);
            }
        }

        enum class Slot { empty, retrack, target, highlight };

        struct Look
        {
            juce::String name;
            bool isOutput = false;
            Slot retrack = Slot::empty;
            bool dim = false;
        };

        // Heights from the top of a strip, like Logic: Setting, EQ, Input, then the Audio FX slots.
        constexpr float stripInsetX = 3.0f, stripInsetY = 4.0f, fxTop = 11 + 3 + 14 + 3 + 11 + 4, fxStep = 14.0f;

        juce::Rectangle<float> fxSlot (juce::Rectangle<float> strip, int index)
        {
            auto r = strip.reduced (stripInsetX, stripInsetY);
            return { r.getX(), r.getY() + fxTop + fxStep * (float) index, r.getWidth(), 12.0f };
        }

        void drawRetrackSlot (juce::Graphics& g, juce::Rectangle<float> r, Slot state, bool blinkOn)
        {
            switch (state)
            {
                case Slot::retrack:
                    slot (g, r, brand::accent, "Retrack", juce::Colours::white);
                    break;
                case Slot::target:
                {
                    slot (g, r, slotEmpty, {});
                    juce::Path outline, dashed;
                    outline.addRoundedRectangle (r.reduced (0.5f), 2.5f);
                    const float dashes[] = { 3.0f, 2.0f };
                    juce::PathStrokeType (1.3f).createDashedStroke (dashed, outline, dashes, 2);
                    g.setColour (blinkOn ? brand::accentLight : slotEmpty.brighter (0.3f));
                    g.fillPath (dashed);
                    g.setFont (brand::font (8.0f, brand::Weight::medium));
                    g.drawText ("Retrack", r, juce::Justification::centred, false);
                    break;
                }
                case Slot::highlight:
                    slot (g, r, slotEmpty.brighter (0.15f), {});
                    g.setColour (juce::Colours::white.withAlpha (0.8f));
                    g.drawRoundedRectangle (r.reduced (0.5f), 2.5f, 1.0f);
                    break;
                case Slot::empty:
                    slot (g, r, slotEmpty, {});
                    break;
            }
        }

        /** One channel strip, top to bottom like Logic's, with the track name in a coloured bar at the bottom. */
        void drawStrip (juce::Graphics& g, juce::Rectangle<float> strip, const Look& look, bool blinkOn)
        {
            juce::Graphics::ScopedSaveState save (g);
            if (look.dim)
                g.setOpacity (0.4f);

            g.setColour (stripBg);
            g.fillRoundedRectangle (strip, 4.0f);
            auto r = strip.reduced (stripInsetX, stripInsetY);
            auto take = [&r] (float h, float after) { auto a = r.removeFromTop (h); r.removeFromTop (after); return a; };

            slot (g, take (11.0f, 3.0f), slotGrey, "Setting");
            auto eq = take (14.0f, 3.0f);
            g.setColour (faderTrack);
            g.fillRoundedRectangle (eq, 2.0f);
            g.setColour (dimText);
            g.fillRect (eq.getX() + 3.0f, eq.getCentreY(), eq.getWidth() - 6.0f, 0.8f);
            slot (g, take (11.0f, 4.0f), slotGrey, look.isOutput ? juce::String() : juce::String ("Input"));

            slot (g, take (12.0f, 2.0f), slotGrey, look.isOutput ? "Limiter" : "Channel EQ");
            slot (g, take (12.0f, 2.0f), slotGrey, look.isOutput ? "Loudness" : "Compressor");
            drawRetrackSlot (g, take (12.0f, 2.0f), look.retrack, blinkOn);
            r.removeFromTop (4.0f);

            auto out = take (11.0f, 4.0f);
            if (! look.isOutput)
                slot (g, out, slotGrey, "Stereo Out");

            auto pan = take (14.0f, 3.0f);
            auto knob = juce::Rectangle<float> (13.0f, 13.0f).withCentre (pan.getCentre());
            g.setColour (slotGrey);
            g.fillEllipse (knob);
            g.setColour (stripText);
            g.fillRect (knob.getCentreX() - 0.6f, knob.getY() + 1.5f, 1.2f, 4.5f);

            auto name = r.removeFromBottom (15.0f);
            g.setColour (look.isOutput ? outPink : trackBlue);
            g.fillRoundedRectangle (name, 3.0f);
            g.setColour (juce::Colours::white);
            g.setFont (brand::font (8.5f, brand::Weight::semibold));
            g.drawFittedText (look.name, name.toNearestInt().reduced (2, 0), juce::Justification::centred, 1, 0.75f);
            r.removeFromBottom (3.0f);

            auto ms = r.removeFromBottom (11.0f);
            auto half = ms.getWidth() / 2.0f;
            slot (g, ms.removeFromLeft (half).reduced (2.0f, 0.0f), slotGrey, "M");
            if (! look.isOutput)
                slot (g, ms.reduced (2.0f, 0.0f), slotGrey, "S");
            r.removeFromBottom (3.0f);

            if (r.getHeight() > 8.0f)
            {
                auto fader = juce::Rectangle<float> (3.0f, r.getHeight()).withCentre ({ r.getCentreX() - 5.0f, r.getCentreY() });
                g.setColour (faderTrack);
                g.fillRoundedRectangle (fader, 1.5f);
                g.fillRoundedRectangle (fader.translated (11.0f, 0.0f), 1.5f); // the meter
                g.setColour (juce::Colour (0xffb8b8be));
                g.fillRoundedRectangle (juce::Rectangle<float> (13.0f, 6.0f)
                                            .withCentre ({ fader.getCentreX(), fader.getY() + fader.getHeight() * 0.3f }), 1.5f);
            }
        }

        /** Lays out strips centred in an area. Returns each strip's rectangle. */
        juce::Array<juce::Rectangle<float>> stripRects (juce::Rectangle<float> area, int count, float maxW = 66.0f)
        {
            juce::Array<juce::Rectangle<float>> rects;
            const float gap = 5.0f;
            const float w = juce::jmin (maxW, (area.getWidth() - gap * (float) (count - 1)) / (float) count);
            float x = area.getCentreX() - (w * (float) count + gap * (float) (count - 1)) / 2.0f;
            for (int i = 0; i < count; ++i, x += w + gap)
                rects.add ({ x, area.getY(), w, area.getHeight() });
            return rects;
        }

        void drawPointer (juce::Graphics& g, juce::Point<float> tip, bool copyBadge = false)
        {
            juce::Path p;
            p.startNewSubPath (0.0f, 0.0f);
            p.lineTo (0.0f, 15.0f);
            p.lineTo (3.8f, 11.6f);
            p.lineTo (6.4f, 17.2f);
            p.lineTo (8.8f, 16.2f);
            p.lineTo (6.3f, 10.8f);
            p.lineTo (11.0f, 10.8f);
            p.closeSubPath();
            p.applyTransform (juce::AffineTransform::translation (tip));
            g.setColour (juce::Colours::white);
            g.strokePath (p, juce::PathStrokeType (2.2f, juce::PathStrokeType::mitered));
            g.setColour (juce::Colours::black);
            g.fillPath (p);

            if (copyBadge)
            {
                auto badge = juce::Rectangle<float> (11.0f, 11.0f).withCentre (tip + juce::Point<float> (14.0f, 16.0f));
                g.setColour (juce::Colours::white);
                g.fillEllipse (badge.expanded (1.0f));
                g.setColour (juce::Colour (0xff2fb34a));
                g.fillEllipse (badge);
                g.setColour (juce::Colours::white);
                g.fillRect (badge.getCentreX() - 3.0f, badge.getCentreY() - 0.7f, 6.0f, 1.4f);
                g.fillRect (badge.getCentreX() - 0.7f, badge.getCentreY() - 3.0f, 1.4f, 6.0f);
            }
        }

        /** A click ripple around the pointer for a moment after a click. */
        void drawClick (juce::Graphics& g, juce::Point<float> at, double t, double clickAt)
        {
            auto k = phase (t, clickAt, clickAt + 0.35);
            if (k <= 0.0f || k >= 1.0f)
                return;
            g.setColour (juce::Colours::white.withAlpha (0.7f * (1.0f - k)));
            g.drawEllipse (juce::Rectangle<float> (8.0f + 16.0f * k, 8.0f + 16.0f * k).withCentre (at), 1.5f);
        }

        /** A small Logic-style menu. Returns each item's rectangle. */
        juce::Array<juce::Rectangle<float>> drawMenu (juce::Graphics& g, juce::Point<float> topLeft, const juce::StringArray& items,
                                                      int highlighted, const juce::Array<bool>& hasSubmenu)
        {
            const float w = 76.0f, itemH = 13.0f;
            auto box = juce::Rectangle<float> (topLeft.x, topLeft.y, w, itemH * (float) items.size() + 6.0f);
            g.setColour (juce::Colours::black.withAlpha (0.35f));
            g.fillRoundedRectangle (box.translated (0.0f, 2.0f), 5.0f);
            g.setColour (menuBg);
            g.fillRoundedRectangle (box, 5.0f);
            g.setColour (juce::Colour (0xff55555a));
            g.drawRoundedRectangle (box.reduced (0.5f), 5.0f, 1.0f);

            juce::Array<juce::Rectangle<float>> rects;
            for (int i = 0; i < items.size(); ++i)
            {
                auto r = juce::Rectangle<float> (box.getX() + 3.0f, box.getY() + 3.0f + itemH * (float) i, w - 6.0f, itemH);
                rects.add (r);
                if (i == highlighted)
                {
                    g.setColour (menuBlue);
                    g.fillRoundedRectangle (r, 3.0f);
                }
                g.setColour (stripText);
                g.setFont (brand::font (8.5f, brand::Weight::medium));
                g.drawText (items[i], r.withTrimmedLeft (6.0f), juce::Justification::centredLeft, false);
                if (hasSubmenu[i])
                {
                    juce::Path arrow;
                    arrow.addTriangle (r.getRight() - 8.0f, r.getCentreY() - 3.0f, r.getRight() - 8.0f, r.getCentreY() + 3.0f,
                                       r.getRight() - 4.0f, r.getCentreY());
                    g.fillPath (arrow);
                }
            }
            return rects;
        }

        /** Logic's transport buttons: back, play, record, cycle. Returns the cycle button's rectangle. */
        juce::Rectangle<float> drawTransport (juce::Graphics& g, juce::Point<float> topLeft, bool playing, bool cycleOn)
        {
            const float s = 20.0f, gap = 4.0f;
            juce::Rectangle<float> b (topLeft.x, topLeft.y, s, s);
            for (int i = 0; i < 4; ++i, b.translate (s + gap, 0.0f))
            {
                const bool lit = (i == 1 && playing) || (i == 3 && cycleOn);
                g.setColour (i == 3 && cycleOn ? cycleGold : juce::Colour (0xff3a3a3d));
                g.fillRoundedRectangle (b, 4.0f);
                auto c = b.getCentre();
                g.setColour (i == 3 && cycleOn ? juce::Colour (0xff3a2a00) : (lit ? juce::Colour (0xff3fd16b) : stripText));
                juce::Path p;
                switch (i)
                {
                    case 0: // back to start
                        g.fillRect (c.x - 5.0f, c.y - 4.0f, 1.6f, 8.0f);
                        p.addTriangle (c.x + 4.0f, c.y - 4.0f, c.x + 4.0f, c.y + 4.0f, c.x - 3.0f, c.y);
                        g.fillPath (p);
                        break;
                    case 1: // play
                        p.addTriangle (c.x - 3.0f, c.y - 5.0f, c.x - 3.0f, c.y + 5.0f, c.x + 5.0f, c.y);
                        g.fillPath (p);
                        break;
                    case 2: // record
                        g.setColour (juce::Colour (0xffe5484d));
                        g.fillEllipse (juce::Rectangle<float> (9.0f, 9.0f).withCentre (c));
                        break;
                    case 3: // cycle: two arrows chasing round a loop
                    {
                        juce::Path loop;
                        loop.addCentredArc (c.x, c.y, 5.5f, 4.0f, 0.0f, 0.5f, 2.7f, true);
                        loop.addCentredArc (c.x, c.y, 5.5f, 4.0f, 0.0f, 3.65f, 5.85f, true);
                        g.strokePath (loop, juce::PathStrokeType (1.4f));
                        break;
                    }
                }
            }
            return { topLeft.x + (s + gap) * 3.0f, topLeft.y, s, s };
        }

        /** A key in the corner of a picture, with a caption-less label like "option". */
        void cornerKey (juce::Graphics& g, juce::Rectangle<float> area, const juce::String& label, bool pressed)
        {
            auto f = brand::font (12.0f, brand::Weight::medium);
            auto w = juce::jmax (22.0f, juce::GlyphArrangement::getStringWidth (f, label) + 18.0f);
            drawKey (g, { area.getRight() - w - 12.0f, area.getBottom() - 34.0f }, label, 22.0f, pressed);
        }
    }

    //==============================================================================
    void MixerPicture::paint (juce::Graphics& g)
    {
        auto area = getLocalBounds().toFloat();
        g.setColour (logicBg);
        g.fillRoundedRectangle (area, 10.0f);
        if (strips.isEmpty())
            return;

        auto rects = stripRects (area.reduced (10.0f, 8.0f), strips.size());
        for (int i = 0; i < strips.size(); ++i)
        {
            auto& s = strips.getReference (i);
            Look look { s.name, s.isOutput, s.hasRetrack ? Slot::retrack : s.target ? Slot::target : Slot::empty, s.dim };
            drawStrip (g, rects[i], look, blinkOn);
        }
    }

    void CyclePicture::paint (juce::Graphics& g)
    {
        auto area = getLocalBounds().toFloat();
        g.setColour (logicBg);
        g.fillRoundedRectangle (area, 8.0f);

        auto keyW = juce::GlyphArrangement::getStringWidth (brand::font (12.0f, brand::Weight::semibold), "C") + 18.0f;
        auto ruler = area.reduced (10.0f, 0.0f).withTrimmedRight (keyW + 10.0f).withSizeKeepingCentre (area.getWidth() - 30.0f - keyW, 26.0f);

        g.setColour (juce::Colour (0xff2c2c2f));
        g.fillRoundedRectangle (ruler, 3.0f);

        // Bar numbers 1, 3, 5, 7… like Logic's ruler.
        const int bars = 9;
        const float barW = ruler.getWidth() / (float) bars;
        auto cycle = juce::Rectangle<float> (ruler.getX() + barW * 2.0f, ruler.getY() + 2.0f, barW * 4.0f, 9.0f);
        g.setColour (cycleGold);
        g.fillRoundedRectangle (cycle, 2.0f);

        g.setFont (brand::font (8.5f, brand::Weight::medium));
        for (int i = 0; i < bars; ++i)
        {
            const float bx = ruler.getX() + barW * (float) i;
            g.setColour (juce::Colour (0xff6a6a70));
            g.fillRect (bx, ruler.getY() + 13.0f, 1.0f, ruler.getHeight() - 15.0f);
            if (i % 2 == 0)
            {
                g.setColour (stripText);
                g.drawText (juce::String (i + 1), juce::Rectangle<float> (bx + 3.0f, ruler.getY() + 12.0f, 20.0f, 12.0f),
                            juce::Justification::centredLeft, false);
            }
        }

        drawKey (g, { ruler.getRight() + 10.0f, area.getCentreY() - 11.0f }, "C");
    }

    void RecordLight::paint (juce::Graphics& g)
    {
        auto r = getLocalBounds().toFloat().reduced (2.0f);
        auto d = juce::jmin (r.getWidth(), r.getHeight());
        auto circle = r.withSizeKeepingCentre (d, d);
        const juce::Colour red (0xffe5484d);
        g.setColour (juce::Colour (0xfffdeceb));
        g.fillEllipse (circle);
        g.setColour (on ? red : juce::Colour (0xfff7c1c1));
        g.drawEllipse (circle.reduced (1.0f), 2.0f);
        g.setColour (red.withAlpha (on ? 1.0f : 0.7f));
        g.fillEllipse (circle.withSizeKeepingCentre (d * 0.32f, d * 0.32f));
    }

    //==============================================================================
    juce::String Walkthrough::caption (int page)
    {
        switch (page)
        {
            case 0:  return "Insert Retrack as the last plugin on a track you want retracked.";
            case 1:  return "Hold Option and drag it onto each other track you want retracked.";
            case 2:  return "Drag one more copy onto the Stereo Out, after your other plugins.";
            case 3:  return "If you're retracking more than one track, press C to turn on Cycle over the section.";
            default: return "Click Arm in any Retrack window, then press play. Retrack records one loop for each track.";
        }
    }

    void Walkthrough::setPage (int p)
    {
        page = juce::jlimit (0, pageCount - 1, p);
        startMs = juce::Time::getMillisecondCounterHiRes();
        repaint();
    }

    void Walkthrough::visibilityChanged()
    {
        if (isVisible())
        {
            startMs = juce::Time::getMillisecondCounterHiRes();
            startTimerHz (30);
        }
        else
            stopTimer();
    }

    double Walkthrough::now() const
    {
        if (frozenAt >= 0.0)
            return frozenAt;
        return std::fmod ((juce::Time::getMillisecondCounterHiRes() - startMs) / 1000.0, period);
    }

    void Walkthrough::paint (juce::Graphics& g)
    {
        auto area = getLocalBounds().toFloat();
        g.setColour (logicBg);
        g.fillRoundedRectangle (area, 10.0f);
        const double t = now();
        switch (page)
        {
            case 0:  paintInsert (g, area, t); break;
            case 1:  paintCopy (g, area, t, false); break;
            case 2:  paintCopy (g, area, t, true); break;
            case 3:  paintCycle (g, area, t); break;
            default: paintArm (g, area, t); break;
        }
    }

    void Walkthrough::paintInsert (juce::Graphics& g, juce::Rectangle<float> area, double t)
    {
        // Strips sit on the left so the plugin menu has room to open to the right.
        auto stripsArea = area.reduced (12.0f, 8.0f).withWidth (4 * 62.0f + 3 * 5.0f);
        auto rects = stripRects (stripsArea, 4, 62.0f);
        auto target = fxSlot (rects[0], 2);
        const bool inserted = t >= 2.95;
        const bool clicked = t >= 1.15 && ! inserted;

        Look looks[] = { { "Drums", false, inserted ? Slot::retrack : clicked ? Slot::highlight : Slot::empty },
                         { "Keys" }, { "Bass" }, { "Stereo Out", true } };
        for (int i = 0; i < 4; ++i)
            drawStrip (g, rects[i], looks[i], true);

        auto start = juce::Point<float> (area.getRight() - 40.0f, area.getBottom() - 30.0f);
        auto pointer = glide (start, target.getCentre(), t, 0.1, 1.05);

        if (clicked && t >= 1.3)
        {
            auto m1 = drawMenu (g, { target.getRight() + 2.0f, target.getY() - 3.0f },
                                { "Dynamics", "EQ", "Reverb", "Audio Units" }, t >= 1.75 ? 3 : -1, { false, false, false, true });
            pointer = glide (pointer, m1[3].getCentre(), t, 1.3, 1.75);
            if (t >= 1.9)
            {
                auto m2 = drawMenu (g, { m1[3].getRight() + 4.0f, m1[3].getY() - 3.0f }, { "Apple", "RetrackThis" },
                                    t >= 2.35 ? 1 : 0, { true, true });
                pointer = glide (m1[3].getCentre(), m2[1].getCentre(), t, 1.9, 2.35);
                if (t >= 2.45)
                {
                    auto m3 = drawMenu (g, { m2[1].getRight() + 4.0f, m2[1].getY() - 3.0f }, { "Retrack" },
                                        t >= 2.75 ? 0 : -1, { false });
                    pointer = glide (m2[1].getCentre(), m3[0].getCentre(), t, 2.45, 2.75);
                }
            }
        }
        if (inserted)
            pointer = { target.getRight() + 160.0f, target.getY() + 32.0f };

        drawClick (g, target.getCentre(), t, 1.1);
        drawPointer (g, pointer);
    }

    void Walkthrough::paintCopy (juce::Graphics& g, juce::Rectangle<float> area, double t, bool toOutput)
    {
        auto rects = stripRects (area.reduced (12.0f, 8.0f).withTrimmedRight (80.0f), 4, 62.0f);
        const int from = toOutput ? 1 : 0, to = toOutput ? 3 : 1;
        auto source = fxSlot (rects[from], 2), target = fxSlot (rects[to], 2);
        const bool dropped = t >= 2.4;
        const bool optionDown = t >= 0.85 && t < 2.8;
        const bool dragging = t >= 1.1 && ! dropped;

        Look looks[] = { { "Drums", false, Slot::retrack }, { "Keys", false, toOutput ? Slot::retrack : Slot::empty },
                         { "Bass" }, { "Stereo Out", true } };
        if (dropped)
            looks[to].retrack = Slot::retrack;
        else if (t >= 2.0)
            looks[to].retrack = Slot::highlight;
        for (int i = 0; i < 4; ++i)
            drawStrip (g, rects[i], looks[i], true);

        auto start = juce::Point<float> (area.getRight() - 120.0f, area.getBottom() - 40.0f);
        auto pointer = glide (start, source.getCentre(), t, 0.1, 0.8);
        if (t >= 1.1)
            pointer = glide (source.getCentre(), target.getCentre(), t, 1.1, 2.3);

        if (dragging)
        {
            auto ghost = source.withCentre (pointer);
            g.setColour (brand::accent.withAlpha (0.75f));
            g.fillRoundedRectangle (ghost, 2.5f);
            g.setColour (juce::Colours::white);
            g.setFont (brand::font (8.0f, brand::Weight::medium));
            g.drawText ("Retrack", ghost, juce::Justification::centred, false);
        }

        cornerKey (g, area, "option", optionDown);
        drawPointer (g, pointer, dragging && optionDown);
    }

    void Walkthrough::paintCycle (juce::Graphics& g, juce::Rectangle<float> area, double t)
    {
        const bool cycleOn = t >= 1.3;
        const bool playing = t >= 2.0;
        auto inner = area.reduced (14.0f, 12.0f);
        drawTransport (g, inner.getTopLeft() + juce::Point<float> (70.0f, 0.0f), playing, cycleOn);

        // Track headers on the left, the ruler and regions to the right, like Logic's Tracks area.
        auto body = inner.withTrimmedTop (30.0f).withTrimmedBottom (34.0f);
        auto headers = body.removeFromLeft (66.0f);
        body.removeFromLeft (4.0f);
        auto ruler = body.removeFromTop (20.0f);
        headers.removeFromTop (20.0f);
        g.setColour (juce::Colour (0xff2c2c2f));
        g.fillRoundedRectangle (ruler, 3.0f);

        const int bars = 6;
        const float barW = ruler.getWidth() / (float) bars;
        g.setFont (brand::font (8.5f, brand::Weight::medium));
        for (int i = 0; i < bars; ++i)
        {
            const float bx = ruler.getX() + barW * (float) i;
            g.setColour (juce::Colour (0xff6a6a70));
            g.fillRect (bx, ruler.getY() + 11.0f, 1.0f, ruler.getHeight() - 12.0f);
            g.setColour (stripText);
            g.drawText (juce::String (1 + i * 4), juce::Rectangle<float> (bx + 3.0f, ruler.getY() + 9.0f, 20.0f, 11.0f),
                        juce::Justification::centredLeft, false);
        }

        auto cycle = juce::Rectangle<float> (ruler.getX() + 1.0f, ruler.getY() + 1.5f, barW * 2.0f * ease (phase (t, 1.3, 1.5)), 7.5f);
        if (cycleOn)
        {
            g.setColour (cycleGold);
            g.fillRoundedRectangle (cycle, 2.0f);
        }

        const char* names[] = { "Drums", "Keys", "Bass" };
        const float laneH = juce::jmin (24.0f, body.getHeight() / 3.0f);
        for (int i = 0; i < 3; ++i)
        {
            auto lane = juce::Rectangle<float> (body.getX(), body.getY() + 4.0f + laneH * (float) i, body.getWidth(), laneH - 3.0f);
            auto header = juce::Rectangle<float> (headers.getX(), lane.getY(), headers.getWidth(), lane.getHeight());
            g.setColour (juce::Colour (0xff2c2c2f));
            g.fillRoundedRectangle (header, 3.0f);
            g.setColour (stripText);
            g.setFont (brand::font (9.0f, brand::Weight::medium));
            g.drawText (names[i], header.withTrimmedLeft (8.0f), juce::Justification::centredLeft, false);

            auto region = lane.withWidth (barW * 2.0f - 2.0f);
            g.setColour (trackBlue);
            g.fillRoundedRectangle (region, 3.0f);
            g.setColour (juce::Colours::white.withAlpha (0.55f));
            for (float x = region.getX() + 4.0f; x < region.getRight() - 4.0f; x += 3.0f)
            {
                const float h = (region.getHeight() - 8.0f) * (0.25f + 0.75f * std::abs (std::sin (x * 0.29f + (float) i * 1.7f)));
                g.fillRect (x, region.getCentreY() + 2.0f - h / 2.0f, 1.4f, h);
            }
            g.setColour (juce::Colours::white);
            g.setFont (brand::font (8.0f, brand::Weight::semibold));
            g.drawText (names[i], region.reduced (4.0f, 1.0f), juce::Justification::topLeft, false);
        }

        // The playhead goes round the cycle.
        if (playing)
        {
            const float loopW = barW * 2.0f;
            const float x = ruler.getX() + loopW * (float) std::fmod ((t - 2.0) / 1.4, 1.0);
            g.setColour (juce::Colours::white);
            g.fillRect (x, ruler.getY(), 1.2f, body.getBottom() - ruler.getY());
        }

        cornerKey (g, area, "C", t >= 1.05 && t < 1.5);
    }

    void Walkthrough::paintArm (juce::Graphics& g, juce::Rectangle<float> area, double t)
    {
        const bool armed = t >= 1.0;
        const bool playing = t >= 2.0;
        const juce::Colour red (0xffe5484d);

        // A small Retrack window floating over Logic.
        auto window = juce::Rectangle<float> (area.getX() + 18.0f, area.getY() + 18.0f, 180.0f, area.getHeight() - 36.0f);
        g.setColour (brand::page);
        g.fillRoundedRectangle (window, 9.0f);
        brand::drawBadge (g, { window.getX() + 10.0f, window.getY() + 9.0f, 16.0f, 16.0f });
        g.setColour (brand::ink);
        g.setFont (brand::font (11.0f, brand::Weight::semibold));
        g.drawText ("Retrack", juce::Rectangle<float> (window.getX() + 31.0f, window.getY() + 9.0f, 100.0f, 16.0f),
                    juce::Justification::centredLeft, false);

        auto button = juce::Rectangle<float> (110.0f, 30.0f).withCentre ({ window.getCentreX(), window.getCentreY() + 4.0f });
        if (! armed)
        {
            g.setColour (brand::accent);
            g.fillRoundedRectangle (button, 15.0f);
            g.setColour (juce::Colours::white);
            g.setFont (brand::font (12.0f, brand::Weight::semibold));
            g.drawText ("Arm", button, juce::Justification::centred, false);
        }
        else
        {
            const bool blink = playing || std::fmod (t, 0.6) < 0.4;
            auto light = juce::Rectangle<float> (34.0f, 34.0f).withCentre (button.getCentre().translated (0.0f, -6.0f));
            g.setColour (juce::Colour (0xfffdeceb));
            g.fillEllipse (light);
            g.setColour (blink ? red : juce::Colour (0xfff7c1c1));
            g.drawEllipse (light.reduced (1.0f), 1.6f);
            g.setColour (red);
            g.fillEllipse (light.withSizeKeepingCentre (11.0f, 11.0f));
            g.setColour (brand::ink);
            g.setFont (brand::font (10.5f, brand::Weight::semibold));
            g.drawText (playing ? "Recording" : "Press play", light.withY (light.getBottom() + 4.0f).withHeight (14.0f).expanded (40.0f, 0.0f),
                        juce::Justification::centred, false);
        }

        // Logic's side: the transport, then one loop per track filling in.
        auto right = area.withTrimmedLeft (window.getRight() - area.getX() + 20.0f).reduced (8.0f, 18.0f);
        drawTransport (g, right.getTopLeft(), playing, true);
        const char* names[] = { "Loop 1: Drums", "Loop 2: Keys" };
        for (int i = 0; i < 2; ++i)
        {
            auto row = juce::Rectangle<float> (right.getX(), right.getY() + 40.0f + 34.0f * (float) i, right.getWidth() - 12.0f, 26.0f);
            g.setColour (stripText);
            g.setFont (brand::font (9.5f, brand::Weight::medium));
            g.drawText (names[i], row.removeFromTop (12.0f), juce::Justification::centredLeft, false);
            auto bar = row.withTrimmedTop (3.0f);
            g.setColour (juce::Colour (0xff2c2c2f));
            g.fillRoundedRectangle (bar, 3.0f);
            const float fill = phase (t, 2.1 + 1.2 * i, 3.3 + 1.2 * i);
            if (fill > 0.0f)
            {
                g.setColour (brand::accent);
                g.fillRoundedRectangle (bar.withWidth (bar.getWidth() * fill), 3.0f);
            }
        }

        cornerKey (g, area, "space", t >= 1.75 && t < 2.1);
        auto start = juce::Point<float> (area.getRight() - 60.0f, area.getBottom() - 60.0f);
        auto pointer = glide (start, button.getCentre().translated (6.0f, 2.0f), t, 0.1, 0.9);
        drawClick (g, button.getCentre(), t, 0.95);
        drawPointer (g, pointer);
    }

    //==============================================================================
    float drawKey (juce::Graphics& g, juce::Point<float> tl, const juce::String& label, float h, bool pressed)
    {
        auto f = brand::font (12.0f, brand::Weight::medium);
        auto w = juce::jmax (h, juce::GlyphArrangement::getStringWidth (f, label) + 18.0f);
        juce::Rectangle<float> key (tl.x, tl.y, w, h);
        g.setColour (juce::Colour (0xffd6d4cd));
        g.fillRoundedRectangle (key.translated (0.0f, 2.0f), 5.0f);
        if (pressed)
            key.translate (0.0f, 2.0f);
        g.setColour (pressed ? brand::accentSoft : juce::Colours::white);
        g.fillRoundedRectangle (key, 5.0f);
        g.setColour (pressed ? brand::accent : juce::Colour (0x22111113));
        g.drawRoundedRectangle (key.reduced (0.5f), 5.0f, pressed ? 1.5f : 1.0f);
        g.setColour (brand::ink);
        g.setFont (f);
        g.drawText (label, key, juce::Justification::centred, false);
        return w;
    }
}
