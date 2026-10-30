# Wattprint

## What this is

A base, not an app. It is an Expo SDK 58 / React Native 0.88 (New Architecture) project that runs as an
Android development build (no Expo Go, no web) and wires the core tooling: Expo Router with native tabs,
Uniwind (Tailwind CSS v4) and gluestack-ui v5 components, TanStack Query/Form/Pacer, Zustand with MMKV
persistence, expo-secure-store, i18next, a validated env module, lint/format/typecheck/test, git hooks,
EAS config (no builds yet) and GitHub Actions CI. Build features on top of it.

The app has four tabs: **Home** (smart-home dashboard), **Devices**, **Energy** (a victory-native chart) and **Settings**.
Home, Devices and Energy run on static mock data validated by Zod (no backend yet; real data is the next step). The
base checks (theme buttons, modal, sample form, secure storage, i18n) live in the Settings tab (`src/screens/settings`).

## Requirements

- Node >= 22.13 (`.nvmrc`: 22.23.3)
- pnpm 12 (`packageManager`: pnpm@12.14.0)
- JDK 17
- Android SDK, `ANDROID_HOME` set, and a device for the dev build: the physical phone (Pixel 8a, USB debugging, adb serial
  `3C081JEKB17021`) is the verification device; the emulator `Medium_Phone_API_37.0` is an optional fallback
- Windows only: Android SDK CMake 4.x installed (see "Windows long-path workaround")
- Windows only: `LongPathsEnabled=1` (see below)

## Setup

```sh
pnpm install
cp .env.example .env   # optional; see Environment
pnpm android           # expo run:android: builds and launches the dev build
```

`pnpm start` starts Metro for an already installed dev build.

## Done commands

```sh
pnpm check           # lint (max-warnings 0) + typecheck (expo customize tsconfig.json && tsc) + jest
pnpm format:check    # prettier --check
npx expo-doctor      # all checks must pass
pnpm android         # then verify on the phone (screenshot + logcat with no E ReactNativeJS lines)
```

Verification device: the physical phone. Forward Metro with `adb -s 3C081JEKB17021 reverse tcp:8081 tcp:8081`, then relaunch via the
dev-client deep link with `adb -s 3C081JEKB17021 shell "am start -p com.dafoggo.wattprint.dev -a android.intent.action.VIEW -d 'wattprint://?__expo_url=http%3A%2F%2Flocalhost%3A8081&__expo_disable_onboarding=1&__expo_disable_fab=1&__expo_disable_auto_launch=1'"`. The three builds share the `wattprint://` scheme, so a deep link without `-p com.dafoggo.wattprint.dev` may open another installed variant.
Emulator fallback (optional): use `adb -s emulator-5554` and `10.0.2.2:8081` in the deep link; emulator builds are x86 and the
phone is ARM, so an x86 apk does not install on the phone.

Device check (debug app id `com.dafoggo.wattprint.dev`): start Metro, relaunch the app, take a screenshot
(`adb -s 3C081JEKB17021 exec-out screencap -p`) and read `adb -s 3C081JEKB17021 logcat -d ReactNativeJS:V *:S`; there must be no `E` lines.

## Structure

```
.github/workflows/ci.yml        CI: install --frozen-lockfile, pnpm check, expo-doctor
.husky/                         pre-commit (lint-staged), commit-msg (commitlint)
.claude/skills/wattprint-base/  project skill (tracked): SKILL.md router, references/ digests of docs/, evals/evals.json
docs/architecture.md            feature-slice architecture and import rules
docs/data-fetching.md           data layer rules, choices, open decisions
docs/components.md              composition rules, variants, vendored UI exceptions
docs/design-system.md           tokens, contrast, type, spacing, Android and accessibility rules
docs/client-state.md            homes of state, Zustand + MMKV stores, persist, logout, tests
docs/performance.md             lists, images, startup, Hermes/React Compiler, bundle, measuring
docs/superpowers/               HANDOFF.md (gates, standing rules), specs/, plans/, reports/, backlog/
plugins/with-android-cmake-dir.js   config plugin, see Windows long-path workaround
scripts/boundaries.test.ts       proves the import-boundary lint (eslint.boundaries.js)
scripts/uniwind-guard.test.ts   guards Uniwind native pitfalls
scripts/design-guard.test.ts    guards hard-coded colours and dark: colour pairs
scripts/guard-utils.ts          file walker and source scanner shared by the guard tests
scripts/contrast-report.js      prints WCAG contrast ratios for the tokens in src/global.css
scripts/docs-links.test.ts      guards docs: relative links, backticked repo paths, skills named in AGENTS.md
scripts/config-guard.test.ts    guards config (no web, no template leftovers, Metro/Uniwind wiring)
scripts/app-identity.js|.test.ts  env => application id suffix; eas.json assertions
src/app/                        routes only: _layout.tsx (ErrorBoundary, auth guard), +not-found.tsx, (auth) sign-in and sign-up, (app) the tabs: one folder with a Stack per tab: (home), (devices), (energy), (settings)
src/components/ui/              gluestack-ui v5 components (hand-copied): button, input, modal, icon, provider, card, switch, badge, progress, heading, text, pressable, divider
src/features/devices/          mock-backed slice: schemas, mock data, selectors, DeviceStatesProvider, rows, screen
src/features/energy/           mock-backed slice: schemas, mock data, selectors, victory-native chart, summaries, screen
src/screens/home/               dashboard composed from devices and energy (the only 2-feature screen)
src/screens/settings/           settings: theme buttons, sample form, modal, SecureStore (base checks)
src/screens/not-found/          not-found screen (used by +not-found.tsx)
src/screens/route-error/        error screen (used by the root ErrorBoundary)
src/hooks/                      shared hooks
src/components/states/          loading, empty, error state components
src/lib/                        wiring: http + errors, query-client, online-manager, nav-theme, storage (MMKV)
eslint.boundaries.js            import boundary rules (tested by scripts/boundaries.test.ts)
src/stores/                     Zustand stores (preferences, persisted)
src/i18n/                       i18next setup and locales/{en,vi}.json
src/env.ts                      zod-validated EXPO_PUBLIC_* env
src/global.css                  Tailwind + Uniwind entry and theme variables
src/uniwind-types.d.ts          generated by Metro, committed (fresh clones typecheck)
app.config.ts, app.json, eas.json, metro.config.js, eslint.config.js, jest.setup.ts
```

`android/` is generated by prebuild and git-ignored.

## Environment

`src/env.ts` validates `EXPO_PUBLIC_APP_ENV` (`development` | `preview` | `production`, default
`development`) and optional `EXPO_PUBLIC_API_URL` (FastAPI, with the `/api/v1` prefix) and `EXPO_PUBLIC_AUTH_URL` (Better Auth service)
at startup. `EXPO_PUBLIC_*` values are inlined into the
bundle and are never secret. Read them only through static dot access (`process.env.EXPO_PUBLIC_X`),
as `src/env.ts` does; destructuring or bracket access is not inlined.

## Pinned versions

Resolved from `pnpm-lock.yaml` (`pnpm list --depth 0`).

| Package                        | Version | Package                    | Version          |
| ------------------------------ | ------- | -------------------------- | ---------------- |
| expo                           | 58.0.19 | uniwind                    | 1.13.0           |
| react-native                   | 0.88.0  | tailwindcss                | 4.3.3            |
| react                          | 19.3.0  | @gluestack-ui/core         | 5.0.15           |
| expo-router                    | 58.0.26 | @gluestack-ui/utils        | 5.0.6            |
| expo-dev-client                | 58.0.15 | @tanstack/react-query      | 5.104.5          |
| react-native-reanimated        | 4.7.1   | @tanstack/react-form       | 1.33.5           |
| react-native-worklets          | 0.13.0  | @tanstack/react-pacer      | 0.24.1 (pre-1.0) |
| react-native-gesture-handler   | 3.3.0   | zustand                    | 5.0.16           |
| react-native-screens           | 4.30.0  | react-native-mmkv          | 4.3.2            |
| react-native-safe-area-context | 5.10.1  | react-native-nitro-modules | 0.37.1           |
| react-native-svg               | 15.16.0 | expo-secure-store          | 58.0.2           |
| zod                            | 4.6.7   | expo-localization          | 58.0.5           |
| i18next                        | 26.5.6  | react-i18next              | 17.1.4           |
| typescript                     | 6.0.3   | eslint                     | 9.39.5           |
| prettier                       | 3.9.10  | jest / jest-expo           | 30.5.2 / 58.0.12 |
| @testing-library/react-native  | 14.1.0  | husky / lint-staged        | 9.1.7 / 17.6.0   |
| @commitlint/cli                | 21.2.4  | eas-cli (global)           | 25.3.0           |
| @shopify/react-native-skia     | 2.14.0  | victory-native             | 42.0.1           |
| @expo/html-elements            | 58.0.3  |                            |                  |

## Uniwind native rules

Uniwind skips, without any warning, every class it cannot translate on native. Pitfalls:

- Unsupported variants are silently ignored: `placeholder:`, `hover:`, `focus-visible:`, `before:`/`after:`, `web:`, `group-*` (Pro), `data-[hover=true]`. Use `data-[focus|active|disabled|invalid=true]:` states.
- Non-style colour props (TextInput placeholder/cursor/selection, ActivityIndicator `color`, Switch track and thumb, and Svg/Lucide icons used directly) need the `{prop}ClassName` binding with an `accent-` class, e.g. `placeholderTextColorClassName="accent-muted-foreground"`; `text-*` in `className` does not reach them. The gluestack `Icon`/`ButtonIcon` take their colour from `text-*` (verified on device).
- A third-party component needs `withUniwind` once, in one file, then is reused (`StyledUIIcon` in `src/components/ui/icon`).
- `scripts/uniwind-guard.test.ts` fails on unsupported classes inside string literals, on missing colour bindings on `ActivityIndicator`, `TextInput` and the gluestack `UISwitch` (track; the vendored `Switch` also binds the off track and thumb), and on importing `Switch` from `react-native` outside `src/components/ui`. It does not check Svg/Lucide icons.

## Decisions and recorded deviations

**Package manager and linker.** pnpm with `nodeLinker: hoisted` in `pnpm-workspace.yaml`. With the isolated
linker, `.pnpm/<name@ver_hash>` paths pushed CMake/ninja paths over 260 characters and the
`react-native-screens` / `react-native-worklets` native builds failed. `allowBuilds` marks
`unrs-resolver` and `@parcel/watcher` as not built (optional; prebuilt binaries are used).

**Windows long-path workaround.** Even with hoisting, the default NDK CMake 3.22.1 ninja is not long-path
aware (`Filename longer than 260 characters` in `rngesturehandler_codegen_autolinked_build`; `subst` did not
help). `plugins/with-android-cmake-dir.js` (registered in `app.json`) runs only on Windows (or with `WATTPRINT_FORCE_CMAKE_DIR=1`; on other platforms and EAS it does nothing, because forcing CMake 4 can break old CMakeLists) and writes `cmake.dir=<ANDROID_HOME>/cmake/<4.x>`
into `android/local.properties` on prebuild (picks the highest CMake >= 4.0, one line, no duplicates; warns
only if none is installed or `ANDROID_HOME` is unset). It runs **only on prebuild**: an existing `android/`
is not re-processed, so delete `android/` or run `npx expo prebuild --platform android` after changing it.
Requirements: `LongPathsEnabled=1` (`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem`), SDK CMake 4.x
(4.1.2 used), JDK 17, `ANDROID_HOME` set.

**Skia and CMake 4.x.** Skia's `CMakeLists.txt` declares `cmake_minimum_required(VERSION 3.4.1)`, which CMake 4.x rejects
(verified: `node_modules/@shopify/react-native-skia/android/CMakeLists.txt`). Local Android builds with SDK CMake 4.x need
`CMAKE_POLICY_VERSION_MINIMUM=3.5` in the environment of `pnpm android` (PowerShell:
`$env:CMAKE_POLICY_VERSION_MINIMUM='3.5'`; bash: `export CMAKE_POLICY_VERSION_MINIMUM=3.5`). Do not change the plugin or Gradle for it.

**victory-native is pinned to 42.0.1.** 43.x peers on the unscoped `react-native-skia >=2.15.1`, which installs a second
Skia copy next to `@shopify/react-native-skia` (verified: `npm view victory-native@43.0.1 peerDependencies`). Expo SDK 58 pins
`@shopify/react-native-skia` 2.14.0 (verified: `node_modules/expo/bundledNativeModules.json`), and 42.0.1 peers on
`@shopify/react-native-skia >=2.6.0 <3.0.0` (verified: `node_modules/victory-native/package.json`). Upgrade trigger: when Expo bumps
Skia to >=2.15.1, use 43.x. Risk: victory 42 uses the deprecated gesture-handler `Gesture` builder (verified:
`node_modules/victory-native/dist/cartesian/CartesianChart.js`); RNGH 3.3.0 still exports it and its `GestureDetector` falls back to
`LegacyGestureDetector` (verified: `node_modules/react-native-gesture-handler/lib/module/v3/detectors/GestureDetector.js`). 42's peer range
has no upper bound for RNGH, so pnpm will not warn when RNGH removes it. Details: `docs/superpowers/backlog/2026-10-26-victory-native-43-upgrade.md`.

**Line endings.** `.gitattributes` has `* text=auto eol=lf`. The machine's global `core.autocrlf=true`
produced CRLF checkouts, while Prettier requires LF.

**Folders.** Library wiring lives in `src/lib`, `src/stores` and `src/i18n`; `src/app` holds routes only.

**Styling vs the expo-native-ui skill.** That skill prefers inline styles and the `Color` API; this project deliberately
styles with Uniwind classes and semantic tokens (the design-system skill says never to add a second system). The
navigation theme is built from the same tokens (`src/hooks/use-nav-theme.ts`).

**Error boundaries.** Only the root layout exports `ErrorBoundary`, so a render error replaces the whole app
with the error screen. Per-tab `ErrorBoundary` exports in the tab layouts are a later refinement.

**Pacer.** `@tanstack/react-pacer` is 0.x (pre-1.0), chosen by the user, used only via `useDebouncedValue`.
Expect API changes.

**gluestack-ui.** The CLI is not used. `gluestack-ui init --uniwind` (5.0.3) forces NativeWind v4 when
`android/` exists (it then classifies the app as a library; gluestack's docs support `--uniwind`, so this is not a deliberate Uniwind gap: the CLI misclassified this project, cause not found; verified: <https://gluestack.io/ui/docs/home/getting-started/cli> and this history) and installs alpha `core`/`utils`, downgrades
uniwind, tailwindcss and safe-area-context, and rewrites Metro/Babel config. All of that was reverted. The
components (provider, icon, button, input, modal) were hand-copied from the CLI's cached Uniwind template with
stable `@gluestack-ui/core` 5.0.15 and `@gluestack-ui/utils` 5.0.6; web variants were not copied. Later added from the same template: card, switch, badge, progress, heading, text, pressable, divider (`heading` needs `@expo/html-elements`; `box`, `hstack`, `vstack`, `avatar` and alpha parts were not copied; the copied files were converted from CRLF to LF and formatted with Prettier; duplicate imports from `@gluestack-ui/utils/nativewind-utils` were merged for lint). Deviations from upstream: `switch` drops `web:cursor-pointer`, `disabled:cursor-not-allowed` and the `ring-indicator-primary` class (no such token) and binds `trackColorOnClassName="accent-primary"`, `trackColorOffClassName="accent-input"`, `thumbColorClassName="accent-switch-thumb"` on the native Switch (new token `--switch-thumb`, light `255 255 255`, dark `125 125 125`, registered in `src/global.css`; the old `accent-card` thumb was invisible on the dark card, 1.00:1. Pairs in `scripts/contrast-report.js`: dark thumb on `card` 4.36 and on `primary` 3.85, light on `input` 3.03 and on `primary` 17.93. Deviation and limit: the dark thumb on the off track `input` is 1.44, below 3:1, so it is not a checked pair; the thumb position and the track against the card carry the state, see `docs/design-system.md`) (Uniwind types it as `className?: never`); `badge` destructive text and icon use `text-destructive-foreground` (upstream `text-white`) and reuse `StyledUIIcon` from `@/components/ui/icon`; `heading` and `text` drop the `highlight` variant (`bg-yellow-500`, a palette class) and `text` `isTruncated` uses `line-clamp-1` (upstream `web:truncate`; Uniwind maps it to `numberOfLines` through `WebkitLineClamp`, `truncate` would be a no-op on native; verified: `node_modules/uniwind/dist/common/components/native/Text.js`). `heading` and `text` use `font-heading`, `font-body` and `tracking-sm`, which are not defined in `src/global.css`, so Uniwind drops them (verified: grep of `src/global.css` and `src/components/ui`); `pressable` base is `data-[disabled=true]:opacity-40` only (`data-[focus-visible=true]` classes are banned by `scripts/uniwind-guard.test.ts`). `card`, `progress` and `divider` are unchanged. Our code never passes the vendored boolean props (`bold`, `italic`, `underline`, `isTruncated`, ...). For the original five parts, three edits: `Input` is `min-h-12` (upstream `min-h-9`) and draws its border with `border-input` (upstream `border-border`; `--input` was darkened to reach 3:1, see `docs/design-system.md`); every `Button` size has at least `min-h-12` (48 dp Android touch target; upstream uses `min-h-8`/`min-h-9`/`min-h-10`/none, see the
comment in `src/components/ui/button/index.tsx`); and `opacity: 0` removed from the modal `ZoomIn` `withInitialValues`: Reanimated builds ZoomIn's initial values from transform keys only, so the `opacity` key was ignored (and `tsc` rejected the type); removing it is a runtime no-op. Do not run
`gluestack-ui add` or `init` blindly, and use no alpha components (Tabs, Table, BottomSheet, Calendar,
DateTimePicker, Skeleton, Grid, Liquid Glass, Image Viewer).

**Web packages.** `react-native-web` and `react-dom` are direct dependencies only because they are required
peers (react-native-web: gluestack core/utils; react-dom: `@tanstack/react-pacer`) and `npx expo-doctor` flags
them otherwise. Recorded exception: they are never imported under `src/` (guarded by
`scripts/config-guard.test.ts`) and there is no web config, script or output.

**Other kept or added items.** `expo-symbols` is kept (SDK 58 NativeTabs needs it for `md` icons).
`@types/node` is added with `"types": ["jest", "node"]` (the guard test uses `fs`/`path`). `lightningcss` is
not pinned (no build error). Dev dependencies are added with `pnpm add -D` because
`npx expo install ... -- --dev` misplaced packages on Windows. `.prettierignore` also ignores `.superpowers`.
`src/uniwind-types.d.ts` is eslint-ignored (generated).

**Lint overrides.** None beyond ignoring generated files (`dist`, `android`, `ios`, `.expo`,
`expo-env.d.ts`, `src/uniwind-types.d.ts`). ESLint is 9.x because Expo's lint bootstrap selects `^9`;
pnpm warns it is deprecated.

**Typecheck output.** `expo customize tsconfig.json` prints "Generating: tsconfig.json" on every `pnpm typecheck`
run; it is informational output, not a warning.

**Theme and env at runtime.** The gluestack provider receives `mode` from the preferences store (default `system`; see
`src/stores/preferences-store.ts` and `src/app/_layout.tsx`), which also drives `Uniwind.setTheme`. An invalid `EXPO_PUBLIC_*` env makes the app throw at startup (red screen) by design.

**Jest setup** (`jest.setup.ts`): mocks `react-native-nitro-modules` (MMKV is in-memory under Jest), polyfills
`window.screen` (react-aria), mocks `@tanstack/devtools-event-client` (its interval kept workers alive), and
`transformIgnorePatterns` allows ESM packages (pacer, gluestack, uniwind). RNTL 14 is async: await
`renderHook`, `act`, `unmount`, `fireEvent`.

**Install and runtime warnings (recorded, not hidden).**

- pnpm "ignored build scripts" (global eas-cli install): `dtrace-provider@0.8.8`, `protobufjs@7.6.6`; not approved.
- Gradle "Doing a slower copy instead" hard-link messages (store on another drive): harmless.
- In dev builds the TanStack form devtools client polls on an interval that never connects: harmless.
- After a relaunch through the dev-client deep link, expo-router can log two `E ReactNativeJS` lines
  ("configured linking in multiple places" / "multiple navigation containers"); not seen on plain launches in
  later runs. Not a build/test warning.

**Known limitations.** Dark-mode input placeholder has low contrast (gluestack template colours). Pacer is
pre-1.0.

**EAS and identifiers.** `eas.json` has `development` / `preview` / `production` profiles, each setting
`EXPO_PUBLIC_APP_ENV` and pinning `node` (22.23.3, equals `.nvmrc`) and `pnpm` (12.14.0, equals `packageManager`);
both are documented build-profile fields (docs.expo.dev/eas/json). No build has been run and no credentials
exist. `eas.json` assertions live in `scripts/app-identity.test.ts`.

Identifiers: the base identifier is `com.dafoggo.wattprint`, chosen as `com.<owner>.wattprint` (owner `dafoggo`).
It is cheap to change only until the first `eas build` / credentials exist. `app.json` holds the production id
for `android.package` and `ios.bundleIdentifier`; `app.config.ts` appends a suffix from `EXPO_PUBLIC_APP_ENV`
(`scripts/app-identity.js`), so the three builds coexist on a device:

| Env (profile) | Application id                  | Display name              |
| ------------- | ------------------------------- | ------------------------- |
| development   | `com.dafoggo.wattprint.dev`     | `Wattprint (development)` |
| preview       | `com.dafoggo.wattprint.preview` | `Wattprint (preview)`     |
| production    | `com.dafoggo.wattprint`         | `Wattprint`               |

Local `pnpm android` runs with the default env (`development`), so the local debug app is
`com.dafoggo.wattprint.dev` (use it in `adb shell pm list packages`, `am force-stop`, `monkey -p`). The URL scheme
`wattprint` is the same for all three. The `extra.eas.projectId` (`b6012f6d-0fc1-4b6d-ad59-5451b11a3f70`) was added by hand to `app.json` before login (the
dynamic `app.config.ts` prevents `eas init` from writing it); after login `eas init` reported the project already linked and
wrote `owner` (`dafoggo`, matches `eas whoami`) to `app.json`. `eas config --platform android --profile <profile> --non-interactive`
resolves for all three profiles. The display name changes the native app label on prebuild.
`vi` is the second locale (`supportedLocales: en, vi`).

**CI.** `.github/workflows/ci.yml` (checkout@v7, setup-node@v7, pnpm/action-setup@v6) runs `pnpm format:check`, `pnpm check` and
`npx expo-doctor` on push and pull request. The latest runs on `main` succeeded (`gh run list --repo daFoggo/wattprint-expo`, checked 2026-10-25).

## Open items

1. App icon and splash are Expo template placeholders (`assets/expo.icon`, `assets/images/icon.png`,
   `splash-icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`,
   colours `#E6F4FE` / `#208AEF`). Replace before the first store or preview distribution; they do not block
   `eas build` development builds.

Further open items (persistence spike, auth, chat streaming, per-tab ErrorBoundary, production-env build check,
first-frame theme flash, design-system findings, victory-native 43 upgrade) are listed in `docs/superpowers/backlog/`.

Accepted without action (owner decision): `vi` stays as the second locale; pnpm 12.14.0 support on EAS build images stays
unverified until the first `eas build`.

Resolved: license is `UNLICENSED` (private); choose a licence if the repo becomes public. No LICENSE file.
`claude-config-summary.md` (personal Claude config) is no longer tracked and is git-ignored, but it remains in the
history of earlier commits; the repo has not been pushed, so history can be rewritten later if wanted.
