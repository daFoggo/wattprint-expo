# Expo base project: design

Date: 2026-10-24. Status: draft, awaiting approval.

## Intent and why

Build a clean, reusable **Expo base project** from scratch. It is the foundation for a future app (energy tracking, dashboard, chatbot), but **none of that app's features or UI are in scope**. The base must be correct, current, and free of config that does not fit mobile, so that app work can start without untangling setup mistakes.

## Goals

- A single Expo app that boots on an **Android emulator** (existing AVD `Medium_Phone_API_37.0`) as a **development build** (no Expo Go). A physical device over USB is optional later.
- Current stack: Expo SDK 58, React Native 0.88, New Architecture (the only option), Expo Router with typed routes.
- Styling: **Uniwind** (Tailwind CSS v4) with **gluestack-ui v5** components, wired and proven by one trivial screen.
- Quality tooling that passes on a clean checkout: TypeScript strict, lint, format, unit test runner, git hooks.
- Typed, validated environment config.
- Core libraries installed and wired minimally: server state, client state, forms, secure storage, i18n.
- CI and build pipeline skeleton (EAS).
- Short docs so a future contributor or agent knows the structure and the "done" commands.

## Non-goals

- Any feature screen, branding, dashboard, charts, chatbot, auth flow, backend, or real API.
- Monorepo or shared `packages/`. (User decision: single Expo app.)
- Expo Go support. (User decision.)
- Web, SSR, or Expo web output.
- Copying files or config from the reference Next.js monorepo `noi-that-khanh-linh`. It was read for ideas only; every choice here is made for mobile and verified against current Expo docs.
- Local iOS builds (host is Windows).

## Anti-goals (failure even if it "works")

- Config copied from web conventions that does not belong on mobile.
- Pinning on release candidates or alpha components without a recorded reason.
- Unverified version claims: every pinned version comes from `npx expo install` or the official docs at setup time.
- Demo or template leftovers shipped as if they were product code.

## Constraints and facts found

- Host: Windows 11. Node 22.23.3 (meets SDK 58's 22.13+), pnpm 12.14.0 present.
- Toolchain state (2026-10-24, after setup): Android Studio and SDK present; JDK 17 (Microsoft OpenJDK 17.0.20) installed because Expo docs require JDK 17 (Android Studio's bundled JBR is 25); `ANDROID_HOME`, `JAVA_HOME` and `Path` set at machine level; Windows `LongPathsEnabled=1`; cmdline-tools, platform 36, build-tools 36.0.0 and CMake (4.1.2 and 3.22.1) installed via sdkmanager. React Native pins its own NDK/CMake versions; Gradle selects them at build time.
- Project folder `D:\Dev Projects\wattprint-expo` contains a space. gluestack reports Tailwind hanging on "rebuilding" when the path has spaces. Treat a no-space path as a requirement until disproved.
- Folder is not a git repository yet and currently holds only `claude-config-summary.md`.
- Uniwind is the chosen engine (stable release 1.13.0 at research time). NativeWind v5 is still `5.0.0-rc.0`; NativeWind v4 is incompatible with gluestack v5.
- gluestack v5: some components are alpha (Tabs, Table, BottomSheet, Calendar, DateTimePicker, Skeleton, Grid). Base must not depend on them.
- Pin `lightningcss` 1.30.1 via overrides/resolutions if the Uniwind/gluestack setup requires it (reported for NativeWind v5; verify whether it applies to Uniwind).
- SDK 58: strict TypeScript API is default; R8 on for Android release; `NODE_ENV` set by Expo CLI.

## Approaches considered

- **A. Official template `default@sdk-58`, strip demo, layer tooling (chosen).** Follows Expo's current conventions (`src/app`, Native Tabs). Cost: removing demo content.
- **B. Blank template, hand-wire Router and structure.** Cleaner start, but easy to drift from Expo's recommended setup.
- Dropped: community boilerplates (Ignite, Obytes). Conflicts with "from scratch".

Chosen by the user: **A**.

Styling engine: user first leaned to NativeWind v5; after comparison chose **Uniwind** (stable, same Tailwind v4 and `className` model, supported by the gluestack v5 CLI).

## Decisions as the user made them

- Single Expo app, no monorepo.
- No Expo Go; development build run on the Android emulator (user switched from USB device; agent installs prerequisites and verifies on the emulator).
- Uniwind, not NativeWind.
- Approach A.

## My calls (not yet confirmed by the user)

- pnpm as package manager (works with SDK 54+; Metro handles workspaces automatically, and this repo is single-app). Fallback to npm if pnpm causes native-module resolution issues.
- Android only for the first milestone; iOS only via EAS cloud builds later.
- Path without spaces: the user renames the parent folder `Dev Projects` to `Dev_Projects` (user's choice, done by them), then opens a new session at `D:\Dev_Projects\wattprint-expo`. (The earlier `D:\Dev\wattprint-expo` proposal is dropped.)
- Library set (user: prefer the TanStack family where an equivalent exists): TanStack Form (`@tanstack/react-form`, replaces react-hook-form) + zod, TanStack Query v5 (server state), TanStack Pacer (debounce/throttle, e.g. chat input and search; verify it fits React Native at setup). Kept **Zustand** for client state as my call: TanStack Store's own docs describe it as mainly for internal use by TanStack libraries and list no persistence or middleware, and the base needs MMKV-backed persistence. User may overrule. Not adopted: TanStack Router (Expo Router is required), TanStack Virtual (FlashList is the native list), TanStack Table/DB (no current need). TanStack Form's React Native support is not stated on its overview page, so lớp 5 must verify it on the emulator before the base commits to it. Others: expo-secure-store (secrets), react-native-mmkv (general storage, needs dev build), i18next + expo-localization, Reanimated 4 (SDK-pinned). Install all via `npx expo install` where Expo-managed.
- Tooling: `expo lint` (flat config) + Prettier, jest-expo + React Native Testing Library, Husky + lint-staged + commitlint (conventional commits).
- Env: `app.config.ts` reading `EXPO_PUBLIC_*`, validated by a small Zod module at startup; `.env.example` committed. `EXPO_PUBLIC_*` values are inlined in the bundle, so never secret.
- Build/CI: EAS Build profiles (development, preview, production) and one EAS Workflow or GitHub Actions job running lint, typecheck, test.
- Folder layout follows the `expo-project-structure` skill (new-project rules).
- App display name `Wattprint`, bundle id/package placeholder until the user decides.
- CI: GitHub Actions workflow file (no remote exists yet, so it is syntax-checked only until a repo is pushed). The user already created the Expo project; its ID is `b6012f6d-0fc1-4b6d-ad59-5451b11a3f70` (an identifier, not a secret). After scaffolding, run `pnpm install --global eas-cli` and `eas init --id b6012f6d-0fc1-4b6d-ad59-5451b11a3f70`, which writes the owner and project ID into the app config. This needs the user to be logged in to EAS (`eas login`, done by the user; the agent never handles the password). `eas build` waits until the user confirms the bundle identifier.
- Bundle ID / package: placeholder `com.wattprint.app`, flagged in the docs. Do not create EAS credentials or keystores until the user confirms the final identifier, because changing it later means a new app identity.
- "Zero warnings" means lint, typecheck and test output only. Install-time peer-dependency warnings and Metro/LogBox runtime warnings are recorded in the docs with the reason, not hidden.
- Routing shell: keep a minimal Expo Router layout with Native Tabs and two empty placeholder routes (structure, not demo content). The single styled screen for verification lives in the first tab.
- Error monitoring (Sentry) and E2E (Maestro): leave out of the first pass; add when needed.

## Open for the user (answers change what gets built)

- (Resolved) User renames `Dev Projects` to `Dev_Projects` themselves; work continues in a new session at `D:\Dev_Projects\wattprint-expo`.
- (Resolved) Agent installs prerequisites and verifies on the emulator using `adb` screenshots and logs.

## Build order (each layer verified before the next)

0. Prerequisites (done): JDK 17, Android SDK, `adb`, emulator AVD boots and `adb devices` lists it.
1. Scaffold from `default@sdk-58` in the no-space path; strip demo; confirm app runs on the device as a dev build.
2. TypeScript strict, lint, Prettier; `pnpm check` (lint + typecheck + test) green.
3. Uniwind setup; one class-styled screen renders on device.
4. gluestack v5 init/wiring; Button, Input, one overlay render on device.
5. Core libraries wired minimally with one smoke test each where meaningful.
6. Env module, `app.config.ts`, `.env.example`.
7. Git hooks, EAS config, CI job.
8. Docs: README, structure and "done" commands, agent instructions file.

## Definition of done

- Fresh clone + install + `check` passes with zero warnings.
- Dev build installs and launches on the emulator and shows the styled screen.
- Pinned versions recorded and reproducible from lockfile.
- No demo leftovers; docs describe what exists.

## Left to the builder

Exact file names and folders inside the structure skill's rules, lint rule selection, test file conventions, Husky/commitlint details, EAS profile naming, and how to resolve version conflicts, provided the choice and its reason are noted in the docs.
