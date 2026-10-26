#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

class RetrackThisBridgeEditor : public juce::AudioProcessorEditor,
                                 private juce::Timer
{
public:
    explicit RetrackThisBridgeEditor(RetrackThisBridgeProcessor&);
    ~RetrackThisBridgeEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;

    RetrackThisBridgeProcessor& processorRef;
    juce::Label statusLabel;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RetrackThisBridgeEditor)
};
