<p align="center">
  <img src="assets/logo.svg" width="200" alt="SoberTrap Logo">
</p>

# SoberTrap

SoberTrap is a native C++/Qt settings manager for Sober on Linux. Its dark settings layout is inspired by Fishstrap's searchable navigation and compact option cards; Fishstrap's Windows/WPF implementation and assets are not bundled.

## Build and run

Requirements: C++20, CMake, Qt 6 Widgets/SVG, and a CMake-compatible C++ compiler. Importing custom sky textures also uses Android SDK `etc1tool` from `platform-tools`; SoberTrap searches common SDK locations or accepts `SOBERTRAP_ETC1TOOL_PATH` (`SOBERTUNER_ETC1TOOL_PATH` remains supported).

```sh
./run.sh
```

`run.sh` builds the native app into `build/` and launches it. You can also build and test directly:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```

## Managed files

- Sober config: `~/.var/app/org.vinegarhq.Sober/config/sober/config.json`
- SoberTrap profiles and appearance settings: `~/.var/app/org.vinegarhq.Sober/config/sober/tuner.json`
- Shift-lock texture overlay: `~/.var/app/org.vinegarhq.Sober/data/sober/asset_overlay/content/textures/MouseLockedCursor.png`
- Custom sky faces: `~/.var/app/org.vinegarhq.Sober/data/sober/asset_overlay/android/textures/sky/sky512_*.tex`

FastFlag edits are staged until **Save changes**. Backups and restores use atomic writes; config comments and URL strings are supported. Roblox skyboxes use six square face images (Back, Down, Front, Left, Right, Up); SoberTrap converts them to ETC1/KTX and saves the prior overlay for restore. Restart Sober after changing FastFlags, sky textures, or the shift-lock texture.
