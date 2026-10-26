#include "PluginEditor.h"

RetrackThisBridgeEditor::RetrackThisBridgeEditor(RetrackThisBridgeProcessor& p)
    : AudioProcessorEditor(&p), processorRef(p)
{
    statusLabel.setJustificationType(juce::Justification::centred);
    statusLabel.setFont(juce::Font(16.0f));
    statusLabel.setColour(juce::Label::textColourId, juce::Colours::white);
    addAndMakeVisible(statusLabel);

    setSize(380, 120);
    startTimerHz(10);
}

RetrackThisBridgeEditor::~RetrackThisBridgeEditor()
{
    stopTimer();
}

void RetrackThisBridgeEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff111113));
}

void RetrackThisBridgeEditor::resized()
{
    statusLabel.setBounds(getLocalBounds().reduced(16));
}

void RetrackThisBridgeEditor::timerCallback()
{
    statusLabel.setText("Retrack This Bridge (spike)\n" + processorRef.getStatusText(),
                         juce::dontSendNotification);
}
