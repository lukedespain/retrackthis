#pragma once

#include <JuceHeader.h>

/**
 * Small pictures in the style of Logic Pro, so the steps look like what's on
 * screen in the DAW. Hovering any of them shows a tooltip with the details.
 */
namespace visuals
{
    /** A few Logic channel strips with their plugin slots. One slot can blink to say "insert it here". */
    class MixerPicture : public juce::Component,
                         public juce::SettableTooltipClient,
                         private juce::Timer
    {
    public:
        struct Strip
        {
            juce::String name;
            bool isOutput = false;
            bool hasRetrack = false;
            bool target = false; // the empty last slot blinks
            bool dim = false;
        };

        MixerPicture() { startTimerHz (2); }
        void setStrips (juce::Array<Strip> s) { strips = std::move (s); repaint(); }
        void paint (juce::Graphics&) override;

    private:
        void timerCallback() override { blinkOn = ! blinkOn; repaint(); }
        juce::Array<Strip> strips;
        bool blinkOn = true;
    };

    /** Logic's ruler with the yellow cycle area, plus a C key. */
    class CyclePicture : public juce::Component,
                         public juce::SettableTooltipClient
    {
    public:
        void paint (juce::Graphics&) override;
    };

    /** The blinking red record light shown while armed or capturing. */
    class RecordLight : public juce::Component,
                        private juce::Timer
    {
    public:
        RecordLight() { startTimerHz (2); }
        void paint (juce::Graphics&) override;

    private:
        void timerCallback() override { on = ! on; repaint(); }
        bool on = true;
    };

    /**
     * The walkthrough's moving pictures: a pointer inserting Retrack, Option-dragging
     * copies to other tracks and the Stereo Out, turning on Cycle, linking the plugin
     * window (optional), then Arm and play.
     * Each page loops a few seconds of animation.
     */
    class Walkthrough : public juce::Component,
                        private juce::Timer
    {
    public:
        static constexpr int pageCount = 6;
        static juce::String caption (int page);

        void setPage (int);
        int getPage() const { return page; }
        /** For the snapshot tool: hold the animation at this many seconds into the page. */
        void freezeAt (double seconds) { frozenAt = seconds; repaint(); }

        void paint (juce::Graphics&) override;
        void visibilityChanged() override;

    private:
        void timerCallback() override { repaint(); }
        double now() const;
        void paintInsert (juce::Graphics&, juce::Rectangle<float>, double t);
        void paintCopy (juce::Graphics&, juce::Rectangle<float>, double t, bool toOutput);
        void paintCycle (juce::Graphics&, juce::Rectangle<float>, double t);
        void paintLink (juce::Graphics&, juce::Rectangle<float>, double t);
        void paintArm (juce::Graphics&, juce::Rectangle<float>, double t);

        int page = 0;
        double startMs = 0.0, frozenAt = -1.0;
    };

    /** Draws a keyboard key, like "space" or "C". Returns its width. */
    float drawKey (juce::Graphics&, juce::Point<float> topLeft, const juce::String& label, float height = 22.0f, bool pressed = false);
}
