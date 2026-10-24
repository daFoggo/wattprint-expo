# Agent instructions

Expo SDK 58 / React Native 0.88 base, Android dev build, pnpm. See `README.md` for setup and decisions.

## Done commands

Before calling work done, run and report real results:

- `pnpm check` (lint with zero warnings, typecheck, jest)
- `pnpm format:check`
- `npx expo-doctor`
- For UI or native changes: run on the emulator and verify (see Device verification).

## Code rules

- `src/app` is routes only. Screen bodies go in `src/screens`, wiring in `src/lib`, `src/stores`, `src/i18n`.
- File names are kebab-case.
- Install packages with `npx expo install <pkg>` only (versions come from the SDK). On Windows, add dev
  deps with `pnpm add -D` (`npx expo install ... -- --dev` misplaces them). Never type versions from memory.
- Style with Uniwind classes and semantic tokens only (`bg-background`, `text-foreground`, ...); no
  hard-coded colours. Not NativeWind.
- gluestack-ui: never run `gluestack-ui add/init` blindly (the CLI forces NativeWind when `android/` exists
  and installs alpha packages). Hand-copy from the Uniwind template, stable packages only. No alpha
  components (Tabs, Table, BottomSheet, Calendar, DateTimePicker, Skeleton, Grid, Liquid Glass, Image Viewer).
- `react-native-web` and `react-dom` are required peers only; never import them under `src/`
  (`scripts/config-guard.test.ts` fails).
- Env: read `EXPO_PUBLIC_*` only by static `process.env.EXPO_PUBLIC_X` access (see `src/env.ts`), and never put
  secrets in them (they are inlined in the bundle).
- Keep `nodeLinker: hoisted` and LF line endings (`.gitattributes`); Prettier requires LF.
- Conventional commits (commitlint). Hooks run lint-staged and commitlint; do not bypass them.

## Device verification

- No Expo Go. Use the dev build on the emulator (`Medium_Phone_API_37.0`): `pnpm android` for native changes,
  `npx expo start --dev-client` for JS-only changes.
- Check: relaunch the app, take a screenshot, and read `adb logcat -d ReactNativeJS:V *:S`: no `E` lines.
- Android on Windows needs `LongPathsEnabled=1`, SDK CMake 4.x, JDK 17, `ANDROID_HOME`. The plugin
  `plugins/with-android-cmake-dir.js` writes `cmake.dir` only on prebuild; an existing `android/` is not
  re-processed.
- Stop Metro after checking; do not leave it running.

## EAS

- Never run `eas build` or create credentials/keystores until the user confirms the final bundle identifier
  (placeholder `com.wattprint.app`). The user runs `eas login`; the agent never handles credentials.
- The first tab (`src/screens/home`) is the base-check screen; replace it when building features.
