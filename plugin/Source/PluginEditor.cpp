#include "PluginEditor.h"

RetrackEditor::RetrackEditor(RetrackProcessor& p)
    : AudioProcessorEditor(&p), processorRef(p), account(p.getAccount()), signIn(&account)
{
    signIn.setHostName(RetrackAccount::hostName());
    addChildComponent(signIn);
    account.addChangeListener(this);
    setSize(WorkspaceView::defaultWidth, WorkspaceView::defaultHeight);
    showRightView();
}

RetrackEditor::~RetrackEditor()
{
    account.removeChangeListener(this);
}

void RetrackEditor::changeListenerCallback(juce::ChangeBroadcaster*)
{
    showRightView();
}

void RetrackEditor::showRightView()
{
    const bool signedIn = account.getState().phase == RetrackAccount::State::Phase::signedIn;
    if (signedIn && workspace == nullptr)
    {
        workspace = std::make_unique<WorkspaceView>(processorRef, account);
        addAndMakeVisible(*workspace);
    }
    else if (! signedIn)
        workspace.reset();

    signIn.setVisible(! signedIn);
    resized();
}

void RetrackEditor::paint(juce::Graphics& g)
{
    g.fillAll(brand::page);
}

void RetrackEditor::resized()
{
    signIn.setBounds(getLocalBounds());
    if (workspace != nullptr)
        workspace->setBounds(getLocalBounds());
}
