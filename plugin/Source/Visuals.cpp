#include "Visuals.h"
#include "Brand.h"

namespace visuals
{
    namespace
    {
        // Logic Pro's dark mixer colours.
        const juce::Colour logicBg      { 0xff1e1e20 };
        const juce::Colour stripBg      { 0xff2c2c2f };
        const juce::Colour outputBg     { 0xff242427 };
        const juce::Colour slotEmpty    { 0xff3a3a3e };
        const juce::Colour slotBlue     { 0xff3b6fc4 };
        const juce::Colour stripText    { 0xffd8d8dc };
        const juce::Colour faderTrack   { 0xff17171a };

        void slot (juce::Graphics& g, juce::Rectangle<float> r, juce::Colour fill, const juce::String& text, juce::Colour textColour)
        {
            g.setColour (fill);
            g.fillRoundedRectangle (r, 3.0f);
            if (text.isNotEmpty())
            {
                g.setColour (textColour);
                g.setFont (brand::font (8.5f, brand::Weight::medium));
                g.drawFittedText (text, r.toNearestInt().reduced (2, 0), juce::Justification::centred, 1, 0.8f);
            }
        }
    }

    void MixerPicture::paint (juce::Graphics& g)
    {
        auto area = getLocalBounds().toFloat();
        g.setColour (logicBg);
        g.fillRoundedRectangle (area, 10.0f);
        if (strips.isEmpty())
            return;

        const float gap = 6.0f, pad = 10.0f;
        const float stripW = juce::jmin (64.0f, (area.getWidth() - 2 * pad - gap * (float) (strips.size() - 1)) / (float) strips.size());
        const float totalW = stripW * (float) strips.size() + gap * (float) (strips.size() - 1);
        float x = area.getCentreX() - totalW / 2.0f;
        const float top = area.getY() + pad, bottom = area.getBottom() - pad;

        for (auto& s : strips)
        {
            juce::Graphics::ScopedSaveState save (g);
            if (s.dim)
                g.setOpacity (0.4f);

            auto r = juce::Rectangle<float> (x, top, stripW, bottom - top);
            g.setColour (s.isOutput ? outputBg : stripBg);
            g.fillRoundedRectangle (r, 5.0f);

            auto inner = r.reduced (4.0f, 5.0f);
            g.setColour (stripText);
            g.setFont (brand::font (9.0f, brand::Weight::medium));
            g.drawFittedText (s.name, inner.removeFromTop (13.0f).toNearestInt(), juce::Justification::centred, 1, 0.7f);
            inner.removeFromTop (4.0f);

            const float slotH = 14.0f;
            auto next = [&] { auto sr = inner.removeFromTop (slotH); inner.removeFromTop (3.0f); return sr; };
            slot (g, next(), slotBlue, s.isOutput ? "Limiter" : "Channel EQ", juce::Colours::white);
            slot (g, next(), slotBlue, s.isOutput ? "Meter" : "Compressor", juce::Colours::white);

            auto last = next();
            if (s.hasRetrack)
                slot (g, last, brand::accent, "Retrack", juce::Colours::white);
            else if (s.target)
            {
                g.setColour (slotEmpty);
                g.fillRoundedRectangle (last, 3.0f);
                juce::Path outline;
                outline.addRoundedRectangle (last.reduced (0.5f), 3.0f);
                juce::Path dashed;
                const float dashes[] = { 3.0f, 2.0f };
                juce::PathStrokeType (1.4f).createDashedStroke (dashed, outline, dashes, 2);
                g.setColour (blinkOn ? brand::accentLight : slotEmpty.brighter (0.25f));
                g.fillPath (dashed);
                g.setFont (brand::font (8.5f, brand::Weight::medium));
                g.drawText ("Retrack", last, juce::Justification::centred, false);
            }
            else
                slot (g, last, slotEmpty, {}, {});
            slot (g, next(), slotEmpty, {}, {});

            // A fader, so it reads as a channel strip.
            auto fader = juce::Rectangle<float> (4.0f, juce::jmax (12.0f, inner.getHeight() - 4.0f))
                             .withCentre ({ r.getCentreX(), inner.getCentreY() + 1.0f });
            g.setColour (faderTrack);
            g.fillRoundedRectangle (fader, 2.0f);
            g.setColour (juce::Colour (0xff9a9aa2));
            g.fillRoundedRectangle (juce::Rectangle<float> (16.0f, 6.0f).withCentre ({ fader.getCentreX(), fader.getY() + fader.getHeight() * 0.35f }), 1.5f);

            x += stripW + gap;
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
        g.setColour (juce::Colour (0xfff1c046));
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

    float drawKey (juce::Graphics& g, juce::Point<float> tl, const juce::String& label, float h)
    {
        auto f = brand::font (12.0f, brand::Weight::medium);
        auto w = juce::jmax (h, juce::GlyphArrangement::getStringWidth (f, label) + 18.0f);
        juce::Rectangle<float> key (tl.x, tl.y, w, h);
        g.setColour (juce::Colour (0xffd6d4cd));
        g.fillRoundedRectangle (key.translated (0.0f, 2.0f), 5.0f);
        g.setColour (juce::Colours::white);
        g.fillRoundedRectangle (key, 5.0f);
        g.setColour (juce::Colour (0x22111113));
        g.drawRoundedRectangle (key.reduced (0.5f), 5.0f, 1.0f);
        g.setColour (brand::ink);
        g.setFont (f);
        g.drawText (label, key, juce::Justification::centred, false);
        return w;
    }
}
