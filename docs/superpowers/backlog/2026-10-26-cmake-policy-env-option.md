# CMake policy environment variable

Opened: 2026-10-26. Source: Task 1 of the smarthome UI demo plan (Skia build on Windows).

## Why it matters
A local Android build fails unless every developer sets `CMAKE_POLICY_VERSION_MINIMUM=3.5` by hand, which is easy to forget.

## Facts (measured or verified)
- Skia's `CMakeLists.txt` declares `cmake_minimum_required(VERSION 3.4.1)`, which SDK CMake 4.x rejects
  (verified: `node_modules/@shopify/react-native-skia/android/CMakeLists.txt`).
- The documented workaround is `CMAKE_POLICY_VERSION_MINIMUM=3.5` in the environment of `pnpm android`
  (verified: `README.md` "Skia and CMake 4.x", `AGENTS.md` "Device verification").
- `plugins/with-android-cmake-dir.js` only writes `cmake.dir` on prebuild, on Windows or with `WATTPRINT_FORCE_CMAKE_DIR=1`
  (verified: the plugin source).

## Ideas (not verified)
- idea: pass the policy flag from the config plugin or Gradle `externalNativeBuild` arguments instead of an environment variable; not tried.
- unverified: whether EAS Build images use CMake 3.x or 4.x, so the variable may not be needed there.

## Start when
The first `eas build` for Android, or a second developer reports the build failure.

## Done when
`pnpm android` on a clean Windows checkout builds without the variable set, and an EAS Android build succeeds.

## Docs touched
`README.md` ("Skia and CMake 4.x", "Windows long-path workaround"), `AGENTS.md` "Device verification", `docs/superpowers/HANDOFF.md`.
