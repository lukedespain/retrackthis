#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"
#include "SignInView.h"

class RetrackThisBridgeEditor : public juce::AudioProcessorEditor
{
public:
    explicit RetrackThisBridgeEditor(RetrackThisBridgeProcessor&);
    ~RetrackThisBridgeEditor() override = default;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    RetrackThisBridgeProcessor& processorRef;
    SignInView view;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RetrackThisBridgeEditor)
};
