#include "PluginEditor.h"

RetrackEditor::RetrackEditor(RetrackProcessor& p)
    : AudioProcessorEditor(&p), processorRef(p), view(&p.getAccount())
{
    view.setHostName(RetrackAccount::hostName());
    addAndMakeVisible(view);
    setSize(SignInView::defaultWidth, SignInView::defaultHeight);
}

void RetrackEditor::paint(juce::Graphics& g)
{
    g.fillAll(brand::page);
}

void RetrackEditor::resized()
{
    view.setBounds(getLocalBounds());
}
