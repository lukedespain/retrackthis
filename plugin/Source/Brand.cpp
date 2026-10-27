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
        const juce::String first ("Retrack"), second ("This");

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

    void drawAvatar (juce::Graphics& g, juce::Rectangle<float> area, const juce::String& name, const juce::String& svg)
    {
        // Parsing is the slow part, so keep the last one (it's nearly always the same person).
        // Held by a SharedResourcePointer so it's freed with the last window, not at exit.
        struct Cache { juce::String svg; std::unique_ptr<juce::Drawable> drawable; };
        juce::SharedResourcePointer<Cache> cache;
        constexpr float size = 120.0f;

        if (svg != cache->svg)
        {
            cache->svg = svg;
            cache->drawable.reset();
            if (auto xml = juce::parseXML (svg))
            {
                // Give it a fixed size so its viewBox maps to 0..120 in drawable units.
                xml->setAttribute ("width", (int) size);
                xml->setAttribute ("height", (int) size);
                xml->removeAttribute ("preserveAspectRatio");
                cache->drawable = juce::Drawable::createFromSVG (*xml);
            }
        }

        if (svg.isEmpty() || cache->drawable == nullptr)
        {
            drawInitialsAvatar (g, area, name);
            return;
        }

        // The art spills past the circle on purpose; the clip trims it.
        juce::Graphics::ScopedSaveState save (g);
        juce::Path circle;
        circle.addEllipse (area);
        g.reduceClipRegion (circle);
        cache->drawable->draw (g, 1.0f, juce::AffineTransform::scale (area.getWidth() / size, area.getHeight() / size)
                                            .translated (area.getX(), area.getY()));
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

    //==============================================================================
    LookAndFeel::LookAndFeel()
    {
        setColour (juce::ComboBox::textColourId, ink);
        setColour (juce::ComboBox::arrowColourId, muted);
        setColour (juce::TextEditor::textColourId, ink);
        setColour (juce::TextEditor::highlightColourId, accent.withAlpha (0.25f));
        setColour (juce::TextEditor::highlightedTextColourId, ink);
        setColour (juce::CaretComponent::caretColourId, accent);
        setColour (juce::PopupMenu::backgroundColourId, surface);
        setColour (juce::PopupMenu::textColourId, ink);
        setColour (juce::PopupMenu::highlightedBackgroundColourId, accentSoft);
        setColour (juce::PopupMenu::highlightedTextColourId, ink);
        setColour (juce::PopupMenu::headerTextColourId, muted);
        setColour (juce::ToggleButton::textColourId, ink);
        setColour (juce::ToggleButton::tickColourId, juce::Colours::white);
    }

    juce::Typeface::Ptr LookAndFeel::getTypefaceForFont (const juce::Font& f)
    {
        return (f.isBold() ? font (14.0f, Weight::semibold) : font (14.0f)).getTypefacePtr();
    }

    void LookAndFeel::drawComboBox (juce::Graphics& g, int width, int height, bool, int, int, int, int, juce::ComboBox& box)
    {
        auto r = juce::Rectangle<float> ((float) width, (float) height);
        g.setColour (box.hasKeyboardFocus (true) ? soft.darker (0.03f) : soft);
        g.fillRoundedRectangle (r, 8.0f);
        juce::Path arrow;
        const float cx = r.getRight() - 14.0f, cy = r.getCentreY();
        arrow.startNewSubPath (cx - 4.0f, cy - 2.0f);
        arrow.lineTo (cx, cy + 2.0f);
        arrow.lineTo (cx + 4.0f, cy - 2.0f);
        g.setColour (muted);
        g.strokePath (arrow, juce::PathStrokeType (1.5f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    }

    juce::Font LookAndFeel::getComboBoxFont (juce::ComboBox&) { return font (13.0f); }

    void LookAndFeel::positionComboBoxText (juce::ComboBox& box, juce::Label& label)
    {
        label.setBounds (4, 0, box.getWidth() - 26, box.getHeight());
        label.setFont (getComboBoxFont (box));
    }

    void LookAndFeel::fillTextEditorBackground (juce::Graphics& g, int width, int height, juce::TextEditor& ed)
    {
        g.setColour (ed.hasKeyboardFocus (true) ? soft.darker (0.03f) : soft);
        g.fillRoundedRectangle (juce::Rectangle<float> ((float) width, (float) height), 8.0f);
    }

    void LookAndFeel::drawTextEditorOutline (juce::Graphics& g, int width, int height, juce::TextEditor& ed)
    {
        if (ed.hasKeyboardFocus (true))
        {
            g.setColour (accent.withAlpha (0.5f));
            g.drawRoundedRectangle (juce::Rectangle<float> ((float) width, (float) height).reduced (0.5f), 8.0f, 1.0f);
        }
    }

    juce::Font LookAndFeel::getPopupMenuFont() { return font (13.0f); }

    void LookAndFeel::drawPopupMenuBackground (juce::Graphics& g, int width, int height)
    {
        g.fillAll (surface);
        g.setColour (line);
        g.drawRect (0, 0, width, height);
    }

    juce::Rectangle<int> LookAndFeel::getTooltipBounds (const juce::String& text, juce::Point<int> pos, juce::Rectangle<int> parent)
    {
        juce::AttributedString as;
        as.append (text, font (12.5f), juce::Colours::white);
        juce::TextLayout tl;
        tl.createLayout (as, 240.0f);
        const int w = (int) std::ceil (tl.getWidth()) + 22, h = (int) std::ceil (tl.getHeight()) + 16;
        return juce::Rectangle<int> (pos.x - w / 2, pos.y + 14, w, h).constrainedWithin (parent);
    }

    void LookAndFeel::drawTooltip (juce::Graphics& g, const juce::String& text, int width, int height)
    {
        g.setColour (ink);
        g.fillRoundedRectangle (juce::Rectangle<float> ((float) width, (float) height), 8.0f);
        juce::AttributedString as;
        as.append (text, font (12.5f), juce::Colours::white);
        as.setLineSpacing (1.5f);
        juce::TextLayout tl;
        tl.createLayout (as, (float) width - 22.0f);
        tl.draw (g, juce::Rectangle<float> (11.0f, 8.0f, (float) width - 22.0f, (float) height - 16.0f));
    }

    void LookAndFeel::drawToggleButton (juce::Graphics& g, juce::ToggleButton& b, bool highlighted, bool)
    {
        auto box = juce::Rectangle<float> (16.0f, 16.0f).withCentre ({ 9.0f, (float) b.getHeight() / 2.0f });
        g.setColour (b.getToggleState() ? accent : (highlighted ? muted.withAlpha (0.6f) : muted.withAlpha (0.4f)));
        if (b.getToggleState())
        {
            g.fillRoundedRectangle (box, 4.0f);
            juce::Path tick;
            tick.startNewSubPath (box.getX() + 4.0f, box.getCentreY());
            tick.lineTo (box.getCentreX() - 1.0f, box.getBottom() - 4.5f);
            tick.lineTo (box.getRight() - 3.5f, box.getY() + 4.5f);
            g.setColour (juce::Colours::white);
            g.strokePath (tick, juce::PathStrokeType (1.8f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        }
        else
            g.drawRoundedRectangle (box.reduced (0.5f), 4.0f, 1.2f);

        g.setColour (ink);
        g.setFont (font (12.5f));
        g.drawText (b.getButtonText(), b.getLocalBounds().withTrimmedLeft (24), juce::Justification::centredLeft, true);
    }

    bool TypingComboBox::keyPressed (const juce::KeyPress& key)
    {
        const auto c = key.getTextCharacter();
        const bool typing = c > ' ' || (c == ' ' && typed.isNotEmpty());
        if (! typing || key.getModifiers().isCommandDown() || key.getModifiers().isCtrlDown())
            return juce::ComboBox::keyPressed (key);

        const auto now = juce::Time::getMillisecondCounter();
        if (now - lastTypedMs > 1000)
            typed.clear();
        lastTypedMs = now;
        typed += juce::String::charToString (c);

        // First an item that starts with what was typed, then one with a word that does.
        for (int pass = 0; pass < 2; ++pass)
            for (int i = 0; i < getNumItems(); ++i)
            {
                auto text = getItemText (i);
                if (pass == 0 ? text.startsWithIgnoreCase (typed) : text.containsIgnoreCase (" " + typed))
                {
                    setSelectedItemIndex (i);
                    return true;
                }
            }
        return true;
    }
}
