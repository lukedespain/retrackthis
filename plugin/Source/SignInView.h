#pragma once

#include <JuceHeader.h>
#include "Brand.h"
#include "RetrackAccount.h"

/**
 * The whole Retrack window for now: a header with the logo (and the signed-in
 * account), and a card for whichever sign-in step we're on. The capture UI
 * will replace the signed-in card later.
 */
class SignInView : public juce::Component,
                   private juce::ChangeListener,
                   private juce::Timer
{
public:
    /** Pass nullptr to drive it with setState() only (used by the snapshot tool). */
    explicit SignInView (RetrackAccount*);
    ~SignInView() override;

    void setState (const RetrackAccount::State&);
    /** Shown in copy and sent to the site as part of the client name. */
    void setHostName (const juce::String& name) { hostName = name; repaint(); }
    /** Freezes the countdown and spinner (snapshot tool). */
    void setNow (juce::Time t) { fixedNow = t; }

    void paint (juce::Graphics&) override;
    void resized() override;
    void mouseUp (const juce::MouseEvent&) override;
    void mouseMove (const juce::MouseEvent&) override;

    static constexpr int defaultWidth = 460;
    static constexpr int defaultHeight = 380;

private:
    using Phase = RetrackAccount::State::Phase;
    using Pill = brand::PillButton;

    void changeListenerCallback (juce::ChangeBroadcaster*) override;
    void timerCallback() override;
    void updateButtons();
    juce::Time now() const { return fixedNow == juce::Time() ? juce::Time::getCurrentTime() : fixedNow; }

    juce::Rectangle<float> cardArea() const;
    juce::Rectangle<float> chipArea() const;
    void paintHeader (juce::Graphics&);
    void paintSignedOut (juce::Graphics&, juce::Rectangle<float> card);
    void paintWaiting (juce::Graphics&, juce::Rectangle<float> card);
    void paintSignedIn (juce::Graphics&, juce::Rectangle<float> card);
    void paintError (juce::Graphics&, juce::Rectangle<float> card);
    void paintSpinner (juce::Graphics&, juce::Point<float> centre);

    RetrackAccount* account;
    RetrackAccount::State state;
    juce::String hostName { "your DAW" };
    juce::Time fixedNow;
    bool chipHover = false;

    Pill primary   { {}, Pill::Style::primary };
    Pill secondary { {}, Pill::Style::secondary };
    Pill quiet     { {}, Pill::Style::text };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SignInView)
};
