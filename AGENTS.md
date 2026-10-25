# Agent instructions

Expo SDK 58 / React Native 0.88 base, Android dev build, pnpm. See `README.md` for setup and decisions.

## Done commands

Before calling work done, run and report real results:

- `pnpm check` (lint with zero warnings, typecheck, jest); lint includes the type-aware `@typescript-eslint/no-deprecated` for `src` (not vendored `components/ui`), so `pnpm lint` takes ~11 s
- `pnpm format:check`
- `npx expo-doctor`
- For UI or native changes: run on the emulator and verify (see Device verification).

## Code rules

- `src/app` is routes only. Screen bodies go in `src/screens`, wiring in `src/lib`, `src/stores`, `src/i18n`.
- File names are kebab-case.
- Install packages with `npx expo install <pkg>` only (versions come from the SDK). Exception: keep the exact pins
  `@gluestack-ui/core@5.0.15` and `@gluestack-ui/utils@5.0.6` (installed with `pnpm add` because their dist-tags
  include alphas); never `expo install` or upgrade them blindly. On Windows, add dev
  deps with `pnpm add -D` (`npx expo install ... -- --dev` misplaces them). Never type versions from memory.
- Style with Uniwind classes and semantic tokens only (`bg-background`, `text-foreground`, ...); no
  hard-coded colours. Not NativeWind.
- Uniwind ignores unsupported variants silently (`placeholder:`, `hover:`, `focus-visible:`, `web:`,
  `group-*`); non-style colour props need `*ClassName="accent-..."`; wrap third-party components with
  `withUniwind` once. `scripts/uniwind-guard.test.ts` enforces this.
- gluestack-ui: never run `gluestack-ui add/init` blindly (the CLI forces NativeWind when `android/` exists
  and installs alpha packages). Hand-copy from the Uniwind template, stable packages only. No alpha
  components (Tabs, Table, BottomSheet, Calendar, DateTimePicker, Skeleton, Grid, Liquid Glass, Image Viewer).
- `react-native-web` and `react-dom` are required peers only; never import them under `src/`
  (`scripts/config-guard.test.ts` fails).
- Env: read `EXPO_PUBLIC_*` only by static `process.env.EXPO_PUBLIC_X` access (see `src/env.ts`), and never put
  secrets in them (they are inlined in the bundle).
- Data layer: all HTTP goes through `createApiClient` (`src/lib/http.ts`) with a Zod `schema`; throw `ApiError`,
  `NetworkError`, `ContractError` (`src/lib/errors.ts`), never return fallback data. Retry only
  `isRetryable` errors (network, 5xx); query defaults live in `src/lib/query-client.ts`. Connectivity comes from
  `initOnlineManager` (expo-network). Data screens render `components/states/{loading,empty,error}-state` (paused uses `EmptyState`).
- Import boundaries (`eslint.boundaries.js`, proved by `scripts/boundaries.test.ts`): `src/features/<name>` never
  imports `@/app`, `@/screens`, another feature or `../` (use `./` or `@/features/<name>/...`); `lib`, `stores`,
  `hooks`, `i18n`, `env.ts` never import `components`, `features`, `screens`, `app`; `components` never imports
  `features`, `screens`, `app`; `screens` never imports `app`. Per-feature rules are generated from the folders in `src/features`.
- Architecture: feature slices with thin routes (`docs/architecture.md`): per feature `api.ts`, `schemas.ts`,
  `queries.ts` (key factory + `queryOptions`), `hooks/`, `components/`, `screens/`, colocated tests; no barrel
  files; extract to shared only when a second feature needs it. Data rules and measured choices (staleTime,
  FlashList for a few hundred rows or more, placeholder from list rows): `docs/data-fetching.md`.
- Routes: one folder per tab under `src/app` with its own `_layout.tsx` Stack; the root layout exports
  `ErrorBoundary`; `+not-found.tsx` exists. User-visible strings use i18n keys (en and vi, same keys); error
  text is `selectable`.
- Keep `nodeLinker: hoisted` and LF line endings (`.gitattributes`); Prettier requires LF.
- Conventional commits (commitlint). Hooks run lint-staged and commitlint; do not bypass them.

## Device verification

- No Expo Go. Use the dev build on the emulator (`Medium_Phone_API_37.0`): `pnpm android` for native changes,
  `npx expo start --dev-client` for JS-only changes.
- Check (app id `com.dafoggo.wattprint.dev`): relaunch the app, take a screenshot, and read `adb logcat -d ReactNativeJS:V *:S`: no `E` lines.
- Android on Windows needs `LongPathsEnabled=1`, SDK CMake 4.x, JDK 17, `ANDROID_HOME`. The plugin
  `plugins/with-android-cmake-dir.js` writes `cmake.dir` only on prebuild; an existing `android/` is not
  re-processed.
- Deep-link relaunch: `adb shell "am start -p com.dafoggo.wattprint.dev -a android.intent.action.VIEW -d 'wattprint://?__expo_url=http%3A%2F%2F10.0.2.2%3A8081&__expo_disable_onboarding=1&__expo_disable_fab=1&__expo_disable_auto_launch=1'"`. The three builds share the `wattprint://` scheme, so a deep link without `-p com.dafoggo.wattprint.dev` may open another installed variant.
- Stop Metro after checking; do not leave it running.

## EAS

- Never run `eas build` or create credentials/keystores unless the user asks. The user runs `eas login`; the
  agent never handles credentials.
- Application ids: `com.dafoggo.wattprint` (production, in `app.json`), `.dev` (development) and `.preview`
  suffixes added by `app.config.ts`. Local `pnpm android` installs `com.dafoggo.wattprint.dev`; use it for
  `adb` commands. The id is cheap to change only until the first `eas build`.
- The first tab (`src/screens/home`) is the base-check screen; replace it when building features.
