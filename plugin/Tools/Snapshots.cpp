// Renders each sign-in state of the Retrack window to a PNG (at 2x), so the design
// can be reviewed without opening Logic. Usage: RetrackSnapshots <out-dir>

#include <JuceHeader.h>
#include "../Source/SignInView.h"
#include "../Source/WorkspaceView.h"
#include "../Source/PluginProcessor.h"

namespace
{
    using State = RetrackAccount::State;

    void save (SignInView& view, const State& s, const juce::File& file)
    {
        view.setState (s);
        auto image = view.createComponentSnapshot (view.getLocalBounds(), true, 2.0f);
        file.deleteFile();
        juce::FileOutputStream out (file);
        juce::PNGImageFormat().writeImageToStream (image, out);
        std::cout << file.getFullPathName() << "\n";
    }
}

int main (int argc, char* argv[])
{
    juce::ScopedJuceInitialiser_GUI gui;

    // RetrackSnapshots --svg <dir>: draw each .svg there to a PNG next to it, to check
    // the site's avatar art renders correctly in JUCE.
    if (argc > 2 && juce::String (argv[1]) == "--svg")
    {
        auto dir = juce::File::getCurrentWorkingDirectory().getChildFile (argv[2]);
        for (auto& f : dir.findChildFiles (juce::File::findFiles, false, "*.svg"))
        {
            juce::Image img (juce::Image::ARGB, 240, 240, true);
            juce::Graphics g (img);
            brand::drawAvatar (g, { 0.0f, 0.0f, 240.0f, 240.0f }, "Test Name", f.loadFileAsString());
            auto out = f.withFileExtension ("juce.png");
            out.deleteFile();
            juce::FileOutputStream os (out);
            juce::PNGImageFormat().writeImageToStream (img, os);
        }
        return 0;
    }

    auto dir = juce::File::getCurrentWorkingDirectory().getChildFile (argc > 1 ? argv[1] : "snapshots");
    dir.createDirectory();

    auto now = juce::Time::getCurrentTime();
    SignInView view (nullptr);
    view.setHostName ("Logic Pro");
    view.setNow (now);
    view.setSize (SignInView::defaultWidth, SignInView::defaultHeight);

    State signedOut;
    save (view, signedOut, dir.getChildFile ("1-signed-out.png"));

    State waiting;
    waiting.phase = State::Phase::waiting;
    waiting.userCode = "DVQN-UM6J";
    waiting.expiresAt = now + juce::RelativeTime::seconds (9 * 60 + 41);
    save (view, waiting, dir.getChildFile ("2-waiting.png"));

    State signedIn;
    signedIn.phase = State::Phase::signedIn;
    signedIn.name = "Luke Despain";
    save (view, signedIn, dir.getChildFile ("3-signed-in.png"));

    // With avatar art from the site (pass its SVG file as the 2nd argument).
    if (argc > 2)
    {
        signedIn.avatarSvg = juce::File::getCurrentWorkingDirectory().getChildFile (argv[2]).loadFileAsString();
        save (view, signedIn, dir.getChildFile ("3b-signed-in-avatar.png"));
    }

    State expired;
    expired.phase = State::Phase::error;
    expired.errorTitle = "That code expired";
    expired.errorDetail = "Codes last 10 minutes. Start again to get a new one.";
    save (view, expired, dir.getChildFile ("4-expired.png"));

    State offline;
    offline.phase = State::Phase::error;
    offline.errorTitle = "Can't reach RetrackThis";
    offline.errorDetail = "Check your internet connection, then try again.";
    save (view, offline, dir.getChildFile ("5-offline.png"));

    State starting;
    starting.phase = State::Phase::starting;
    save (view, starting, dir.getChildFile ("6-opening-browser.png"));

    // The signed-in workspace, one PNG per screen. Needs a real processor for its session.
    {
        RetrackProcessor proc;
        auto& account = proc.getAccount();
        WorkspaceView ws (proc, account);
        ws.setSize (WorkspaceView::defaultWidth, WorkspaceView::defaultHeight);
        const char* screens[] = { "intro", "setup1", "setup2", "ready", "armed", "capturing", "failed", "jobs", "posting", "posted" };
        int n = 10;
        for (auto* sc : screens)
        {
            WorkspaceView::Preview p;
            p.screen = sc;
            if (juce::String (sc) != "setup1") p.parts = { "Drums", "Keys" };
            p.hasBed = juce::String (sc) != "setup1" && juce::String (sc) != "setup2";
            ws.showPreview (p);
            auto image = ws.createComponentSnapshot (ws.getLocalBounds(), true, 2.0f);
            auto file = dir.getChildFile ("w" + juce::String (n++) + "-" + sc + ".png");
            file.deleteFile();
            juce::FileOutputStream out (file);
            juce::PNGImageFormat().writeImageToStream (image, out);
        }
    }
    return 0;
}
