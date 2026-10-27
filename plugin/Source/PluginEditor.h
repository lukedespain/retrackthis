#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"
#include "SignInView.h"

class RetrackEditor : public juce::AudioProcessorEditor
{
public:
    explicit RetrackEditor(RetrackProcessor&);
    ~RetrackEditor() override = default;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    RetrackProcessor& processorRef;
    SignInView view;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RetrackEditor)
};
