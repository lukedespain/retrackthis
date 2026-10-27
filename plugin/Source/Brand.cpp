#include "Brand.h"
#include <BinaryData.h>

namespace brand
{
    namespace
    {
        juce::Typeface::Ptr load (const void* data, int size)
        {
            return juce::Typeface::createSystemTypefaceFor (data, (size_t) size);
        }

        juce::Typeface::Ptr typeface (Weight w)
        {
            static auto regular  = load (BinaryData::GeistRegular_ttf,  BinaryData::GeistRegular_ttfSize);
            static auto medium   = load (BinaryData::GeistMedium_ttf,   BinaryData::GeistMedium_ttfSize);
            static auto semibold = load (BinaryData::GeistSemiBold_ttf, BinaryData::GeistSemiBold_ttfSize);
            switch (w)
            {
                case Weight::medium:   return medium;
                case Weight::semibold: return semibold;
                case Weight::regular:  break;
            }
            return regular;
        }
    }

    juce::Font font (float px, Weight weight)
    {
        return juce::Font (juce::FontOptions (typeface (weight)).withPointHeight (px));
    }

    juce::Font mono (float px)
    {
        static auto tf = load (BinaryData::GeistMonoSemiBold_ttf, BinaryData::GeistMonoSemiBold_ttfSize);
        return juce::Font (juce::FontOptions (tf).withPointHeight (px));
    }

    void drawBadge (juce::Graphics& g, juce::Rectangle<float> area)
    {
        static std::unique_ptr<juce::Drawable> badge = juce::Drawable::createFromImageData (BinaryData::badge_svg,
                                                                                          BinaryData::badge_svgSize);
        if (badge != nullptr)
            badge->drawWithin (g, area, juce::RectanglePlacement::centred, 1.0f);
    }

    float drawWordmark (juce::Graphics& g, juce::Point<float> baselineLeft, float px)
    {
        auto f = font (px, Weight::semibold);
        const juce::String first ("Retrack "), second ("This");

        juce::GlyphArrangement a;
        a.addLineOfText (f, first, baselineLeft.x, baselineLeft.y);
        g.setColour (ink);
        a.draw (g);

        auto x2 = baselineLeft.x + juce::GlyphArrangement::getStringWidth (f, first);
        juce::GlyphArrangement b;
        b.addLineOfText (f, second, x2, baselineLeft.y);
        g.setColour (accent);
        b.draw (g);

        return x2 + juce::GlyphArrangement::getStringWidth (f, second) - baselineLeft.x;
    }

    void drawCard (juce::Graphics& g, juce::Rectangle<float> area, float radius)
    {
        juce::Path p;
        p.addRoundedRectangle (area, radius);
        juce::DropShadow (juce::Colour (0x0f111113), 24, { 0, 8 }).drawForPath (g, p);
        juce::DropShadow (juce::Colour (0x0a111113), 3, { 0, 1 }).drawForPath (g, p);
        g.setColour (surface);
        g.fillPath (p);
        g.setColour (line);
        g.strokePath (p, juce::PathStrokeType (1.0f));
    }

    juce::String initialsFor (const juce::String& name)
    {
        auto words = juce::StringArray::fromTokens (name.trim(), " ", "");
        words.removeEmptyStrings();
        juce::String out;
        for (int i = 0; i < words.size() && out.length() < 2; ++i)
            out << words[i].substring (0, 1).toUpperCase();
        return out.isEmpty() ? juce::String ("?") : out;
    }

    void drawInitialsAvatar (juce::Graphics& g, juce::Rectangle<float> area, const juce::String& name)
    {
        juce::ColourGradient grad (accentLight, area.getTopLeft(), accent, area.getBottomRight(), false);
        g.setGradientFill (grad);
        g.fillEllipse (area);
        g.setColour (juce::Colours::white);
        g.setFont (font (area.getHeight() * 0.36f, Weight::semibold));
        g.drawText (initialsFor (name), area, juce::Justification::centred, false);
    }

    PillButton::PillButton (const juce::String& text, Style s) : juce::Button (text), style (s)
    {
        setMouseCursor (juce::MouseCursor::PointingHandCursor);
    }

    void PillButton::paintButton (juce::Graphics& g, bool highlighted, bool down)
    {
        auto r = getLocalBounds().toFloat().reduced (0.5f);
        auto enabled = isEnabled();
        juce::Colour fill, text;

        switch (style)
        {
            case Style::primary:
                fill = down ? accentInk : highlighted ? accentInk.brighter (0.15f) : accent;
                text = juce::Colours::white;
                break;
            case Style::secondary:
                fill = down ? soft.darker (0.08f) : highlighted ? soft.darker (0.04f) : soft;
                text = ink;
                break;
            case Style::text:
                fill = juce::Colours::transparentBlack;
                text = highlighted ? ink : muted;
                break;
        }

        if (! enabled)
        {
            fill = style == Style::primary ? accent.withAlpha (0.45f) : fill;
            text = style == Style::primary ? juce::Colours::white : muted.withAlpha (0.6f);
        }

        g.setColour (fill);
        g.fillRoundedRectangle (r, r.getHeight() / 2.0f);
        g.setColour (text);
        g.setFont (font (style == Style::text ? 13.0f : 14.0f, Weight::medium));
        g.drawText (getButtonText(), getLocalBounds(), juce::Justification::centred, false);
    }
}
