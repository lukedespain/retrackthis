#pragma once

#include <JuceHeader.h>

/** Retrack This brand, matching app/brand.css on the site (light mode). */
namespace brand
{
    const juce::Colour page        { 0xfff3f2ee };
    const juce::Colour soft        { 0xfff5f4f1 };
    const juce::Colour surface     { 0xffffffff };
    const juce::Colour ink         { 0xff111113 };
    const juce::Colour muted       { 0xff76767c };
    const juce::Colour line        { 0x12111113 };
    const juce::Colour accent      { 0xff7b61ff };
    const juce::Colour accentInk   { 0xff604cc7 };
    const juce::Colour accentSoft  { 0xfff3f1ff };
    const juce::Colour accentLight { 0xffb6a8ff };
    const juce::Colour danger      { 0xffc8413b };

    enum class Weight { regular, medium, semibold };

    /** Geist at a CSS-like pixel size. */
    juce::Font font (float px, Weight weight = Weight::regular);
    /** Geist Mono semibold, for codes. */
    juce::Font mono (float px);

    /** The offset badge logo (purple disc, play glyph, black disc down-right). */
    void drawBadge (juce::Graphics&, juce::Rectangle<float> area);

    /** "RetrackThis" (no space, as in the plugin) with only "This" in Iris. Returns the width used. */
    float drawWordmark (juce::Graphics&, juce::Point<float> baselineLeft, float px);

    /** White card with the site's large radius, hairline edge and soft shadow. */
    void drawCard (juce::Graphics&, juce::Rectangle<float> area, float radius = 20.0f);

    /** Round avatar with initials on the site's Iris gradient. */
    void drawInitialsAvatar (juce::Graphics&, juce::Rectangle<float> area, const juce::String& name);
    juce::String initialsFor (const juce::String& name);
    /** The person's avatar art from the site (an SVG string) in a circle, or initials without it. */
    void drawAvatar (juce::Graphics&, juce::Rectangle<float> area, const juce::String& name, const juce::String& svg);

    /** Pill button in the site's styles. */
    class PillButton : public juce::Button
    {
    public:
        enum class Style { primary, secondary, text };

        PillButton (const juce::String& text, Style);
        void setStyle (Style s) { style = s; repaint(); }

    private:
        void paintButton (juce::Graphics&, bool highlighted, bool down) override;
        Style style;
    };
}
