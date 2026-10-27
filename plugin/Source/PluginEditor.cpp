#include "PluginEditor.h"

RetrackThisBridgeEditor::RetrackThisBridgeEditor(RetrackThisBridgeProcessor& p)
    : AudioProcessorEditor(&p), processorRef(p), view(&p.getAccount())
{
    view.setHostName(BridgeAccount::hostName());
    addAndMakeVisible(view);
    setSize(SignInView::defaultWidth, SignInView::defaultHeight);
}

void RetrackThisBridgeEditor::paint(juce::Graphics& g)
{
    g.fillAll(brand::page);
}

void RetrackThisBridgeEditor::resized()
{
    view.setBounds(getLocalBounds());
}
