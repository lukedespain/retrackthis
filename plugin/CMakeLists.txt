cmake_minimum_required(VERSION 3.22)

project(RetrackThisBridge VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version" FORCE)

# Which site the plugin signs in to. Override for local testing:
#   cmake -B build -DRT_BRIDGE_BASE_URL=http://localhost:3000
set(RT_BRIDGE_BASE_URL "https://retrackthis.com" CACHE STRING "Retrack This site the plugin talks to")

include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.4
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(JUCE)

juce_add_binary_data(BridgeAssets
    SOURCES
        Assets/badge.svg
        Assets/fonts/Geist-Regular.ttf
        Assets/fonts/Geist-Medium.ttf
        Assets/fonts/Geist-SemiBold.ttf
        Assets/fonts/GeistMono-SemiBold.ttf
)

# Shared by the plugin and the snapshot tool.
set(BRIDGE_UI_SOURCES
    Source/Brand.cpp
    Source/BridgeAccount.cpp
    Source/SignInView.cpp
)

juce_add_plugin(RetrackThisBridge
    COMPANY_NAME "Retrack This"
    BUNDLE_ID "com.retrackthis.bridge"
    PLUGIN_MANUFACTURER_CODE RtTh
    PLUGIN_CODE Brdg
    FORMATS AU Standalone
    PRODUCT_NAME "Retrack This Bridge"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
)

juce_generate_juce_header(RetrackThisBridge)

target_sources(RetrackThisBridge
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
        ${BRIDGE_UI_SOURCES}
)

target_compile_definitions(RetrackThisBridge
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        RT_BRIDGE_BASE_URL="${RT_BRIDGE_BASE_URL}"
)

target_link_libraries(RetrackThisBridge
    PRIVATE
        BridgeAssets
        juce::juce_audio_utils
        juce::juce_audio_formats
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

# Renders every sign-in state to PNGs, for reviewing the design without opening Logic:
#   ./build/BridgeSnapshots_artefacts/Debug/BridgeSnapshots <out-dir>
juce_add_console_app(BridgeSnapshots PRODUCT_NAME "BridgeSnapshots")
juce_generate_juce_header(BridgeSnapshots)
target_sources(BridgeSnapshots PRIVATE Tools/Snapshots.cpp ${BRIDGE_UI_SOURCES})
target_compile_definitions(BridgeSnapshots
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        RT_BRIDGE_BASE_URL="${RT_BRIDGE_BASE_URL}"
)
target_link_libraries(BridgeSnapshots
    PRIVATE
        BridgeAssets
        juce::juce_gui_extra
        juce::juce_audio_processors
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags
)
