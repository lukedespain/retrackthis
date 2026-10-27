#include "SignInView.h"

using namespace brand;

namespace
{
    constexpr float headerH = 56.0f;
    constexpr float pad = 18.0f;

    /** Centred, wrapped text block; returns its bottom. */
    float drawBlock (juce::Graphics& g, const juce::String& text, juce::Font f, juce::Colour c,
                     juce::Rectangle<float> area, float lineSpacing = 1.0f)
    {
        juce::AttributedString as;
        as.setJustification (juce::Justification::centredTop);
        as.setLineSpacing (lineSpacing);
        as.append (text, f, c);
        juce::TextLayout layout;
        layout.createLayout (as, area.getWidth());
        layout.draw (g, area.withHeight (layout.getHeight()));
        return area.getY() + layout.getHeight();
    }
}

SignInView::SignInView (RetrackAccount* acc) : account (acc)
{
    for (auto* b : { &primary, &secondary, &quiet })
        addChildComponent (b);

    primary.onClick = [this]
    {
        if (account == nullptr) return;
        if (state.phase == Phase::waiting)
            account->openBrowserAgain();
        else
            account->startSignIn ("Retrack (" + hostName + ")");
    };
    secondary.onClick = [this] { if (account != nullptr) account->openBrowserAgain(); };
    quiet.onClick = [this]
    {
        if (state.phase == Phase::signedOut)
            juce::URL (RetrackAccount::baseUrl() + "/sign-up").launchInDefaultBrowser();
        else if (state.phase == Phase::signedIn)
        {
            if (account != nullptr) account->signOut();
        }
        else if (account != nullptr)
            account->cancel();
    };

    if (account != nullptr)
    {
        account->addChangeListener (this);
        state = account->getState();
    }
    updateButtons();
    startTimerHz (30);
}

SignInView::~SignInView()
{
    if (account != nullptr)
        account->removeChangeListener (this);
}

void SignInView::setState (const RetrackAccount::State& s)
{
    state = s;
    updateButtons();
    resized();
    repaint();
}

void SignInView::changeListenerCallback (juce::ChangeBroadcaster*)
{
    if (account != nullptr)
        setState (account->getState());
}

void SignInView::timerCallback()
{
    // Spinner and countdown only.
    if (state.phase == Phase::waiting || state.phase == Phase::starting)
        repaint();
}

void SignInView::updateButtons()
{
    primary.setVisible (false);
    secondary.setVisible (false);
    quiet.setVisible (false);
    primary.setEnabled (true);

    switch (state.phase)
    {
        case Phase::signedOut:
        case Phase::starting:
            primary.setButtonText (state.phase == Phase::starting ? juce::String (juce::CharPointer_UTF8 ("Opening your browser\xe2\x80\xa6")) : "Sign in with your browser");
            primary.setEnabled (state.phase == Phase::signedOut);
            primary.setVisible (true);
            quiet.setButtonText ("New here? Create an account");
            quiet.setVisible (true);
            break;
        case Phase::waiting:
            secondary.setButtonText ("Open browser again");
            secondary.setVisible (true);
            quiet.setButtonText ("Cancel");
            quiet.setVisible (true);
            break;
        case Phase::signedIn:
            quiet.setButtonText ("Sign out");
            quiet.setVisible (true);
            break;
        case Phase::error:
            primary.setButtonText ("Try again");
            primary.setVisible (true);
            quiet.setButtonText ("Cancel");
            quiet.setVisible (true);
            break;
    }
}

//==============================================================================
juce::Rectangle<float> SignInView::cardArea() const
{
    return getLocalBounds().toFloat().withTrimmedTop (headerH).reduced (pad).withTrimmedTop (-4.0f);
}

juce::Rectangle<float> SignInView::chipArea() const
{
    if (state.phase != Phase::signedIn)
        return {};
    auto f = font (13.0f, Weight::medium);
    auto w = 28.0f + 8.0f + juce::GlyphArrangement::getStringWidth (f, state.name) + 14.0f;
    return { (float) getWidth() - pad - w, (headerH - 34.0f) / 2.0f + 4.0f, w, 34.0f };
}

void SignInView::resized()
{
    auto card = cardArea();
    auto bottom = card.withTrimmedTop (card.getHeight() - 92.0f).reduced (28.0f, 0.0f);

    switch (state.phase)
    {
        case Phase::signedOut:
        case Phase::starting:
        case Phase::error:
            primary.setBounds (bottom.removeFromTop (42.0f).withSizeKeepingCentre (240.0f, 42.0f).toNearestInt());
            quiet.setBounds (bottom.removeFromTop (36.0f).withSizeKeepingCentre (220.0f, 30.0f).toNearestInt());
            break;
        case Phase::waiting:
        {
            // One row: Open browser again · Cancel
            auto row = juce::Rectangle<float> (290.0f, 40.0f).withCentre ({ card.getCentreX(), card.getBottom() - 38.0f });
            secondary.setBounds (row.removeFromLeft (190.0f).toNearestInt());
            quiet.setBounds (row.withTrimmedLeft (10.0f).toNearestInt());
            break;
        }
        case Phase::signedIn:
            quiet.setBounds (bottom.withTrimmedTop (42.0f).removeFromTop (36.0f).withSizeKeepingCentre (120.0f, 30.0f).toNearestInt());
            break;
    }
}

void SignInView::mouseMove (const juce::MouseEvent& e)
{
    auto hover = chipArea().contains (e.position);
    if (hover != chipHover)
    {
        chipHover = hover;
        setMouseCursor (hover ? juce::MouseCursor::PointingHandCursor : juce::MouseCursor::NormalCursor);
        repaint (chipArea().expanded (4.0f).toNearestInt());
    }
}

void SignInView::mouseUp (const juce::MouseEvent& e)
{
    if (! chipArea().contains (e.position) || account == nullptr)
        return;

    juce::PopupMenu menu;
    menu.addSectionHeader (state.name);
    menu.addItem ("Open retrackthis.com", [] { juce::URL (RetrackAccount::baseUrl() + "/producers").launchInDefaultBrowser(); });
    menu.addSeparator();
    menu.addItem ("Sign out", [this] { if (account != nullptr) account->signOut(); });
    menu.showMenuAsync (juce::PopupMenu::Options().withTargetComponent (this)
                                                  .withTargetScreenArea (localAreaToGlobal (chipArea().toNearestInt())));
}

//==============================================================================
void SignInView::paint (juce::Graphics& g)
{
    g.fillAll (page);
    paintHeader (g);

    auto card = cardArea();
    drawCard (g, card);

    switch (state.phase)
    {
        case Phase::signedOut:
        case Phase::starting: paintSignedOut (g, card); break;
        case Phase::waiting:  paintWaiting (g, card);   break;
        case Phase::signedIn: paintSignedIn (g, card);  break;
        case Phase::error:    paintError (g, card);     break;
    }
}

void SignInView::paintHeader (juce::Graphics& g)
{
    auto y = headerH / 2.0f + 4.0f;
    drawBadge (g, { pad, y - 13.0f, 26.0f, 26.0f });
    drawWordmark (g, { pad + 34.0f, y + 6.0f }, 17.0f);

    if (state.phase == Phase::signedIn)
    {
        auto chip = chipArea();
        g.setColour (chipHover ? soft.darker (0.03f) : surface);
        g.fillRoundedRectangle (chip, chip.getHeight() / 2.0f);
        g.setColour (line);
        g.drawRoundedRectangle (chip.reduced (0.5f), chip.getHeight() / 2.0f, 1.0f);
        drawAvatar (g, { chip.getX() + 3.0f, chip.getY() + 3.0f, 28.0f, 28.0f }, state.name, state.avatarSvg);
        g.setColour (ink);
        g.setFont (font (13.0f, Weight::medium));
        g.drawText (state.name, chip.withTrimmedLeft (39.0f).withTrimmedRight (10.0f), juce::Justification::centredLeft, true);
    }
}

void SignInView::paintSignedOut (juce::Graphics& g, juce::Rectangle<float> card)
{
    auto inner = card.reduced (32.0f, 0.0f);
    drawBadge (g, juce::Rectangle<float> (46.0f, 46.0f).withCentre ({ card.getCentreX(), card.getY() + 50.0f }));
    auto y = drawBlock (g, "Sign in to RetrackThis", font (20.0f, Weight::semibold), ink, inner.withY (card.getY() + 88.0f));
    drawBlock (g, "Connect Retrack to your account so you can post jobs straight from " + hostName + ".",
               font (14.0f), muted, inner.withY (y + 6.0f), 1.25f);
}

void SignInView::paintWaiting (juce::Graphics& g, juce::Rectangle<float> card)
{
    auto inner = card.reduced (32.0f, 0.0f);
    auto y = drawBlock (g, "Approve in your browser", font (20.0f, Weight::semibold), ink, inner.withY (card.getY() + 24.0f));
    y = drawBlock (g, "Make sure retrackthis.com shows this same code.",
                   font (14.0f), muted, inner.withY (y + 6.0f), 1.25f);

    auto box = juce::Rectangle<float> (230.0f, 58.0f).withCentre ({ card.getCentreX(), y + 16.0f + 29.0f });
    g.setColour (soft);
    g.fillRoundedRectangle (box, 14.0f);
    g.setColour (line);
    g.drawRoundedRectangle (box.reduced (0.5f), 14.0f, 1.0f);

    auto codeFont = mono (27.0f);
    codeFont.setExtraKerningFactor (0.12f);
    g.setColour (ink);
    g.setFont (codeFont);
    g.drawText (state.userCode, box, juce::Justification::centred, false);

    auto left = juce::jmax (0.0, (state.expiresAt - now()).inSeconds());
    auto status = juce::String (juce::CharPointer_UTF8 ("Waiting for approval  \xc2\xb7  code expires in "))
                  + juce::String ((int) left / 60) + ":" + juce::String ((int) left % 60).paddedLeft ('0', 2);
    auto f = font (12.5f);
    auto tw = juce::GlyphArrangement::getStringWidth (f, status);
    auto sy = box.getBottom() + 18.0f;
    auto sx = card.getCentreX() - (tw + 20.0f) / 2.0f;
    paintSpinner (g, { sx + 6.0f, sy });
    g.setColour (muted);
    g.setFont (f);
    g.drawText (status, juce::Rectangle<float> (sx + 20.0f, sy - 9.0f, tw + 4.0f, 18.0f), juce::Justification::centredLeft, false);
}

void SignInView::paintSignedIn (juce::Graphics& g, juce::Rectangle<float> card)
{
    auto inner = card.reduced (32.0f, 0.0f);
    auto avatar = juce::Rectangle<float> (56.0f, 56.0f).withCentre ({ card.getCentreX(), card.getY() + 56.0f });
    drawAvatar (g, avatar, state.name, state.avatarSvg);

    // Small check on the avatar, like the site's connected state.
    auto dot = juce::Rectangle<float> (20.0f, 20.0f).withCentre (avatar.getBottomRight().translated (-6.0f, -6.0f));
    g.setColour (juce::Colours::white);
    g.fillEllipse (dot.expanded (2.5f));
    g.setColour (juce::Colour (0xff1f9d6b));
    g.fillEllipse (dot);
    juce::Path tick;
    tick.startNewSubPath (dot.getX() + 5.5f, dot.getCentreY() + 0.5f);
    tick.lineTo (dot.getCentreX() - 1.0f, dot.getBottom() - 6.0f);
    tick.lineTo (dot.getRight() - 5.0f, dot.getY() + 6.0f);
    g.setColour (juce::Colours::white);
    g.strokePath (tick, juce::PathStrokeType (2.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));

    auto y = drawBlock (g, "You're connected", font (20.0f, Weight::semibold), ink, inner.withY (avatar.getBottom() + 16.0f));
    drawBlock (g, "Signed in as " + state.name + ". Capturing a part and posting a job from "
                  + hostName + " come next.",
               font (14.0f), muted, inner.withY (y + 6.0f), 1.25f);
}

void SignInView::paintError (juce::Graphics& g, juce::Rectangle<float> card)
{
    auto inner = card.reduced (32.0f, 0.0f);
    auto icon = juce::Rectangle<float> (44.0f, 44.0f).withCentre ({ card.getCentreX(), card.getY() + 48.0f });
    g.setColour (danger.withAlpha (0.1f));
    g.fillEllipse (icon);
    g.setColour (danger);
    g.setFont (font (22.0f, Weight::semibold));
    g.drawText ("!", icon, juce::Justification::centred, false);

    auto y = drawBlock (g, state.errorTitle, font (20.0f, Weight::semibold), ink, inner.withY (card.getY() + 84.0f));
    drawBlock (g, state.errorDetail, font (14.0f), muted, inner.withY (y + 6.0f), 1.25f);
}

void SignInView::paintSpinner (juce::Graphics& g, juce::Point<float> c)
{
    auto t = (double) now().toMilliseconds() / 1000.0;
    juce::Path arc;
    arc.addCentredArc (c.x, c.y, 6.0f, 6.0f, (float) (t * juce::MathConstants<double>::twoPi), 0.0f, 4.2f, true);
    g.setColour (accent.withAlpha (0.18f));
    g.drawEllipse (juce::Rectangle<float> (12.0f, 12.0f).withCentre (c), 2.0f);
    g.setColour (accent);
    g.strokePath (arc, juce::PathStrokeType (2.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
}
