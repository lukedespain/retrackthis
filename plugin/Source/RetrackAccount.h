#pragma once

#include <JuceHeader.h>

/**
 * The plugin's sign-in to retrackthis.com, shared by every Retrack instance in
 * the process (hold it with juce::SharedResourcePointer<RetrackAccount>).
 *
 * Device-code flow, matching the site's app/api/plugin/auth routes:
 *   1. POST /api/plugin/auth/start  -> a short code; we open /connect?code=… in the browser.
 *   2. The user approves it on retrackthis.com while we poll POST /api/plugin/auth/token.
 *   3. Approved -> a long-lived key, saved to a file only this macOS user can read.
 * Other instances (even in another process, as Logic sometimes runs plugins out of
 * process) pick up sign-in and sign-out by watching that file.
 *
 * All methods must be called on the message thread; listeners are told about
 * changes there too. Network calls run on a background thread.
 */
class RetrackAccount : public juce::ChangeBroadcaster,
                      private juce::Timer
{
public:
    struct State
    {
        enum class Phase { signedOut, starting, waiting, signedIn, error };

        Phase phase = Phase::signedOut;

        // waiting
        juce::String userCode;
        juce::String verificationUrl;
        juce::Time expiresAt;

        // signedIn
        juce::String name;
        juce::String avatarSvg; // the site's avatar art; empty means show initials

        // error
        juce::String errorTitle;
        juce::String errorDetail;
    };

    RetrackAccount();
    ~RetrackAccount() override;

    State getState() const { return state; }
    /** The plugin key for API calls, or empty when signed out. */
    juce::String getToken() const { return token; }

    void startSignIn (const juce::String& clientName);
    void openBrowserAgain();
    void cancel();
    void signOut();

    static juce::String baseUrl();
    /** "Logic Pro", "Ableton Live"… or "your DAW". */
    static juce::String hostName();

private:
    struct Response
    {
        int status = 0;
        juce::var json;
    };

    void timerCallback() override;
    void setState (State);
    void poll();
    void saveToFile();
    void loadFromFile (bool verifyWithServer);
    void verifyToken();
    void runInBackground (std::function<void()>);

    static Response request (const juce::String& path, const juce::var& body, const juce::String& bearer);
    static juce::File accountFile();

    State state;
    juce::String token;
    juce::String deviceCode;
    int pollIntervalSeconds = 5;
    juce::Time nextPollAt;
    bool pollInFlight = false;
    int generation = 0; // bumped on cancel/sign-out so late network replies are ignored
    juce::Time fileStamp;

    juce::ThreadPool pool { juce::ThreadPoolOptions{}.withThreadName ("Retrack Account").withNumberOfThreads (1) };

    JUCE_DECLARE_WEAK_REFERENCEABLE (RetrackAccount)
    JUCE_DECLARE_NON_COPYABLE (RetrackAccount)
};
