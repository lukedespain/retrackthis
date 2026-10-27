#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"
#include "SignInView.h"
#include "WorkspaceView.h"

/** Shows sign-in until the account is connected, then the workspace. */
class RetrackEditor : public juce::AudioProcessorEditor,
                      private juce::ChangeListener
{
public:
    explicit RetrackEditor(RetrackProcessor&);
    ~RetrackEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void changeListenerCallback(juce::ChangeBroadcaster*) override;
    void showRightView();

    RetrackProcessor& processorRef;
    RetrackAccount& account;
    SignInView signIn;
    std::unique_ptr<WorkspaceView> workspace;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RetrackEditor)
};
