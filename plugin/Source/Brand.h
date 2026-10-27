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

    /** Fields, dropdowns, menus and tooltips in the site's style (Geist, soft fills, round corners). */
    class LookAndFeel : public juce::LookAndFeel_V4
    {
    public:
        LookAndFeel();
        juce::Typeface::Ptr getTypefaceForFont (const juce::Font&) override;
        void drawComboBox (juce::Graphics&, int width, int height, bool isButtonDown,
                           int buttonX, int buttonY, int buttonW, int buttonH, juce::ComboBox&) override;
        juce::Font getComboBoxFont (juce::ComboBox&) override;
        void positionComboBoxText (juce::ComboBox&, juce::Label&) override;
        void fillTextEditorBackground (juce::Graphics&, int width, int height, juce::TextEditor&) override;
        void drawTextEditorOutline (juce::Graphics&, int width, int height, juce::TextEditor&) override;
        juce::Font getPopupMenuFont() override;
        void drawPopupMenuBackground (juce::Graphics&, int width, int height) override;
        juce::Rectangle<int> getTooltipBounds (const juce::String&, juce::Point<int>, juce::Rectangle<int>) override;
        void drawTooltip (juce::Graphics&, const juce::String&, int width, int height) override;
        void drawToggleButton (juce::Graphics&, juce::ToggleButton&, bool highlighted, bool down) override;
    };

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
