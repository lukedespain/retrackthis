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

    /** Draws a keyboard key, like "space" or "C". Returns its width. */
    float drawKey (juce::Graphics&, juce::Point<float> topLeft, const juce::String& label, float height = 22.0f);
}
