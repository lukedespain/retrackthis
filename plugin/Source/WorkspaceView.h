#pragma once

#include <JuceHeader.h>
#include "Brand.h"
#include "Visuals.h"
#include "JobPoster.h"
#include "RetrackAccount.h"

class RetrackProcessor;
class RetrackSession;

/**
 * The Retrack window once you're signed in. Header: logo, this copy's track,
 * help and your account. Below, two columns: a list on the left (setup steps,
 * then the loops being captured, then your jobs) and on the right a picture of
 * the current step or the thing to do next (Arm, the job form, payment).
 */
class WorkspaceView : public juce::Component,
                      private juce::ChangeListener,
                      private juce::Timer
{
public:
    WorkspaceView (RetrackProcessor&, RetrackAccount&);
    ~WorkspaceView() override;

    void paint (juce::Graphics&) override;
    void resized() override;
    void mouseUp (const juce::MouseEvent&) override;
    void mouseMove (const juce::MouseEvent&) override;

    static constexpr int defaultWidth = 580;
    static constexpr int defaultHeight = 400;

    /** For the snapshot tool: show a screen with made-up data. */
    struct Preview
    {
        juce::String screen; // setup1, setup2, ready, armed, capturing, jobs, posting, posted, failed, intro
        juce::StringArray parts;
        bool hasBed = false;
        int walkPage = 0;        // intro only: which walkthrough page
        double walkTime = 1.0;   // intro only: seconds into its animation
    };
    void showPreview (const Preview&);

private:
    enum class Screen { setup, armed, capturing, failed, jobs, posting, posted };
    enum class Step { insertParts, insertBed, arm, play };

    struct Draft
    {
        juce::String trackName;
        juce::String instrumentId, instrumentLabel;
        juce::String budget { "100" };
        int dueDays = 7;
        juce::String notes;
    };
    struct Instrument { juce::String id, label; juce::StringArray aliases; };

    void changeListenerCallback (juce::ChangeBroadcaster*) override;
    void timerCallback() override;
    void refresh();
    void layoutRight();
    Step currentStep() const;

    // Painting
    juce::Rectangle<float> leftCard() const;
    juce::Rectangle<float> rightCard() const;
    juce::Rectangle<float> chipArea() const;
    juce::Rectangle<float> helpArea() const;
    void paintHeader (juce::Graphics&);
    void paintChecklist (juce::Graphics&, juce::Rectangle<float>);
    void paintLoops (juce::Graphics&, juce::Rectangle<float>);
    void paintJobList (juce::Graphics&, juce::Rectangle<float>);
    void paintRight (juce::Graphics&, juce::Rectangle<float>);
    void paintIntro (juce::Graphics&);
    juce::Rectangle<float> introCard() const;
    void showWalkthrough (int page);
    void closeWalkthrough();

    // Jobs
    void enterJobs();
    void loadInstruments();
    void guessInstrument (Draft&);
    void selectDraft (int);
    void storeFormIntoDraft();
    bool draftComplete (const Draft&) const;
    juce::String firstProblem() const;
    void post();
    void openPaymentPage();

    RetrackProcessor& proc;
    RetrackSession& session;
    RetrackAccount& account;
    std::unique_ptr<brand::LookAndFeel> lnf;
    juce::TooltipWindow tooltips { this, 350 };

    Screen screen = Screen::setup;
    bool showingIntro = false;
    bool previewMode = false;
    Preview preview;

    visuals::MixerPicture mixer;
    visuals::CyclePicture cycle;
    visuals::RecordLight light;
    visuals::Walkthrough walkthrough;

    using Pill = brand::PillButton;
    Pill armButton { "Arm", Pill::Style::primary };
    Pill disarmButton { "Disarm", Pill::Style::secondary };
    Pill retryButton { "Arm again", Pill::Style::primary };
    Pill cancelButton { "Cancel", Pill::Style::secondary };
    Pill setupButton { "Back to setup", Pill::Style::text };
    Pill postButton { "Post", Pill::Style::primary };
    Pill recaptureButton { "Recapture", Pill::Style::text };
    Pill filesButton { "Show in Finder", Pill::Style::text };
    Pill payAgainButton { "Open payment again", Pill::Style::secondary };
    Pill newCaptureButton { "Start a new capture", Pill::Style::text };
    Pill backButton { "Back", Pill::Style::text };
    Pill nextButton { "Next", Pill::Style::primary };

    juce::TextEditor titleEditor, notesEditor, budgetEditor;
    brand::TypingComboBox instrumentBox, dueBox, keyBox;
    juce::ToggleButton testToggle { "Admin test" };

    juce::Array<Draft> drafts;
    int selected = 0;
    juce::Array<juce::Rectangle<float>> jobRowAreas;
    juce::Array<Instrument> instruments;
    bool instrumentsRequested = false;
    juce::String formError;

    JobPoster poster;
    juce::String postProgress;
    JobPoster::Result postResult;
    bool chipHover = false;
    bool helpHover = false;

    JUCE_DECLARE_WEAK_REFERENCEABLE (WorkspaceView)
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WorkspaceView)
};
