cmake_minimum_required(VERSION 3.22)

project(Retrack VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version" FORCE)

# Which site the plugin signs in to. Override for local testing:
#   cmake -B build -DRT_BASE_URL=http://localhost:3000
set(RT_BASE_URL "https://retrackthis.com" CACHE STRING "RetrackThis site the plugin talks to")

include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.4
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(JUCE)

juce_add_binary_data(RetrackAssets
    SOURCES
        Assets/badge.svg
        Assets/fonts/Geist-Regular.ttf
        Assets/fonts/Geist-Medium.ttf
        Assets/fonts/Geist-SemiBold.ttf
        Assets/fonts/GeistMono-SemiBold.ttf
)

# Shared by the plugin and the snapshot tool.
set(RETRACK_UI_SOURCES
    Source/Brand.cpp
    Source/RetrackAccount.cpp
    Source/SignInView.cpp
)

# The capture engine and everything the plugin window needs.
set(RETRACK_PLUGIN_SOURCES
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/RetrackSession.cpp
    Source/CaptureClock.cpp
    Source/JobPoster.cpp
    Source/Visuals.cpp
    Source/WorkspaceView.cpp
    ${RETRACK_UI_SOURCES}
)

juce_add_plugin(Retrack
    COMPANY_NAME "RetrackThis"
    BUNDLE_ID "com.retrackthis.retrack"
    PLUGIN_MANUFACTURER_CODE RtTh
    PLUGIN_CODE Rtrk
    FORMATS AU Standalone
    PRODUCT_NAME "Retrack"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
)

juce_generate_juce_header(Retrack)

target_sources(Retrack PRIVATE ${RETRACK_PLUGIN_SOURCES})

target_compile_definitions(Retrack
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        RT_BASE_URL="${RT_BASE_URL}"
)

target_link_libraries(Retrack
    PRIVATE
        RetrackAssets
        juce::juce_audio_utils
        juce::juce_audio_formats
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

# Renders every sign-in state to PNGs, for reviewing the design without opening Logic:
#   ./build/RetrackSnapshots_artefacts/Debug/RetrackSnapshots <out-dir>
juce_add_console_app(RetrackSnapshots PRODUCT_NAME "RetrackSnapshots")
juce_generate_juce_header(RetrackSnapshots)
target_sources(RetrackSnapshots PRIVATE Tools/Snapshots.cpp ${RETRACK_PLUGIN_SOURCES})
target_compile_definitions(RetrackSnapshots
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JucePlugin_Name="Retrack"
        RT_BASE_URL="${RT_BASE_URL}"
)
target_link_libraries(RetrackSnapshots
    PRIVATE
        RetrackAssets
        juce::juce_gui_extra
        juce::juce_audio_utils
        juce::juce_audio_formats
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags
)

# Runs capture the way Logic drives it and checks every part and bed file:
#   ./build/RetrackCaptureTest_artefacts/Debug/RetrackCaptureTest
juce_add_console_app(RetrackCaptureTest PRODUCT_NAME "RetrackCaptureTest")
juce_generate_juce_header(RetrackCaptureTest)
target_sources(RetrackCaptureTest PRIVATE Tools/CaptureTest.cpp ${RETRACK_PLUGIN_SOURCES})
target_compile_definitions(RetrackCaptureTest
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_MODAL_LOOPS_PERMITTED=1
        JucePlugin_Name="Retrack"
        RT_BASE_URL="${RT_BASE_URL}"
)
target_link_libraries(RetrackCaptureTest
    PRIVATE
        RetrackAssets
        juce::juce_audio_utils
        juce::juce_audio_formats
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags
)

# Test plugin for multi-part capture (cycle-loop detection and copies seeing each
# other). Not shipped. Writes WAVs and logs to ~/Desktop/Bridge Probe/.
juce_add_plugin(RTBridgeProbe
    COMPANY_NAME "RetrackThis"
    BUNDLE_ID "com.retrackthis.bridgeprobe"
    PLUGIN_MANUFACTURER_CODE RtTh
    PLUGIN_CODE Prb1
    FORMATS AU
    PRODUCT_NAME "RT Bridge Probe"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
)
juce_generate_juce_header(RTBridgeProbe)
target_sources(RTBridgeProbe PRIVATE Probe/ProbeProcessor.cpp)
target_compile_definitions(RTBridgeProbe PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0)
target_link_libraries(RTBridgeProbe
    PRIVATE
        juce::juce_audio_utils
        juce::juce_audio_formats
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags
)
