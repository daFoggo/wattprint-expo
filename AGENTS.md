# Agent instructions

Expo SDK 58 / React Native 0.88 base, Android dev build, pnpm. See `README.md` for setup and decisions.

## Done commands

Before calling work done, run and report real results:

- `pnpm check` (lint with zero warnings, typecheck, jest); lint includes the type-aware `@typescript-eslint/no-deprecated` for `src` (not vendored `components/ui`), so `pnpm lint` is noticeably slower
- `pnpm format:check`
- `npx expo-doctor`
- For UI or native changes: run on the physical phone and verify (see Device verification).

## Read the doc before changing the area

Open the matching doc first; it holds the rules and the reasons. The project skill `wattprint-base`
(`.claude/skills/wattprint-base`, tracked in git) is a router and digest of these docs with evals; use it to find the right doc
fast. The skill column names the other skills to consult after the doc (global ones, installed in `~/.claude/skills`); the doc wins
when they differ.

| Working on                                         | Read                                     | Skill                                            |
| -------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Any area: find the right doc and the traps         | `.claude/skills/wattprint-base/SKILL.md` | `wattprint-base`                                 |
| Feature folders, routes, imports, boundaries       | `docs/architecture.md`                   | `expo-project-structure`, `expo-router`          |
| Data, HTTP, cache, query keys, offline             | `docs/data-fetching.md`                  | `expo-data-fetching`                             |
| Components, composition, variants, vendored UI     | `docs/components.md`                     | `vercel-composition-patterns`, `gluestack-ui-v5` |
| Styling, tokens, type, touch targets, a11y, motion | `docs/design-system.md`                  | `uniwind`, `expo-design-system`                  |
| Client state, Zustand, MMKV, SecureStore, logout   | `docs/client-state.md`                   | none                                             |
| Performance, lists, images, startup, bundle size   | `docs/performance.md`                    | `vercel-react-native-skills`                     |
| Checking a change on a device                      | "Device verification" below              | `expo-dev-client`                                |

Work records: `docs/superpowers/HANDOFF.md` (gates, standing rules), `specs/`, `plans/`, `reports/`, `backlog/`.

## Doc maintenance

- Change the rule, the doc and the skill in one commit. If a rule here or in a doc changes, update every place that states
  it (this file, the doc, `README.md`) in that commit, and update the global skill in the same change.
- A spec lists the docs it touches; the plan's last task updates them; a report says which ones changed.
- Doc conventions: header with the versions it was written against and links to related docs; claims labelled
  `(verified: <file, command or URL>)` or `(opinion)`; measured numbers keep their caveats and come from a committed script or a dated record (never from memory);
  no invented numbers; end with Checklist, Anti-patterns, Sources. Lines near 110 characters (`docs/` is not checked by Prettier).
- `scripts/docs-links.test.ts` fails on a broken relative link, a backticked repo path that does not exist, or a skill in the
  routing table above that is neither under `.claude/skills` nor listed as global in that test. Fenced code blocks, URLs, globs and
  `<placeholders>` are ignored; `docs/superpowers/plans/` is historical and skipped. Keep `wattprint-base` in step with the docs.
- Open items go to `docs/superpowers/backlog/` (facts versus ideas), finished chunks to `docs/superpowers/reports/`.

## Code rules

- `src/app` is routes only. Screen bodies go in `src/screens`, wiring in `src/lib`, `src/stores`, `src/i18n`.
- File names are kebab-case.
- Install packages with `npx expo install <pkg>` only (versions come from the SDK). Exception: keep the exact pins
  `@gluestack-ui/core@5.0.15` and `@gluestack-ui/utils@5.0.6` (installed with `pnpm add` because their dist-tags
  include alphas); never `expo install` or upgrade them blindly. On Windows, add dev
  deps with `pnpm add -D` (`npx expo install ... -- --dev` misplaces them). Never type versions from memory.
- Style with Uniwind classes and semantic tokens only (`bg-background`, `text-foreground`, ...); no
  hard-coded colours (`scripts/design-guard.test.ts` fails on hex, `rgb()`/`hsl()`, literal `*Color` values and `dark:`
  colour pairs outside `src/components/ui`). Not NativeWind.
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
  `initOnlineManager` (expo-network). Data screens render `components/states/{loading,empty,error}-state` (paused uses `OfflineState`, built on `EmptyState`).
- Import boundaries (`eslint.boundaries.js`, proved by `scripts/boundaries.test.ts`): `src/features/<name>` never
  imports `@/app`, `@/screens`, another feature or `../` (use `./` or `@/features/<name>/...`); `lib`, `stores`,
  `hooks`, `i18n`, `env.ts` never import `components`, `features`, `screens`, `app`; `components` never imports
  `features`, `screens`, `app`; `screens` never imports `app`. Per-feature rules are generated from the folders in `src/features`.
- Architecture: feature slices with thin routes (`docs/architecture.md`): per feature `<feature>/api.ts`, `<feature>/schemas.ts`,
  `<feature>/queries.ts` (key factory + `queryOptions`), `hooks/`, `components/`, `screens/`, colocated tests; no barrel
  files; extract to shared only when a second feature needs it. Data rules and choices (staleTime,
  FlashList for a few hundred rows or more, placeholder from list rows): `docs/data-fetching.md`.
- Routes: one folder per tab under `src/app` with its own `_layout.tsx` Stack; the root layout exports
  `ErrorBoundary`; `+not-found.tsx` exists. User-visible strings use i18n keys (en and vi, same keys); error
  text is `selectable`.
- Keep `nodeLinker: hoisted` and LF line endings (`.gitattributes`); Prettier requires LF.
- Conventional commits (commitlint). Hooks run lint-staged and commitlint; do not bypass them.

## Device verification

- No Expo Go. Use the dev build on the physical phone (Pixel 8a, adb serial `3C081JEKB17021`; always
  `adb -s 3C081JEKB17021 ...`): `pnpm android` for native changes, `npx expo start --dev-client` for JS-only changes.
  Metro is reached through `adb -s 3C081JEKB17021 reverse tcp:8081 tcp:8081`, so the deep link uses `localhost:8081`.
- Fallback (optional): the emulator `Medium_Phone_API_37.0` (`emulator-5554`). Its builds are x86 and the phone is ARM, so an
  x86 apk does not install on the phone; use the matching device for each build and use `10.0.2.2:8081` in the deep link there.
- Check (app id `com.dafoggo.wattprint.dev`): relaunch the app, take a screenshot, and read `adb -s 3C081JEKB17021 logcat -d ReactNativeJS:V *:S`: no `E` lines.
- Android on Windows needs `LongPathsEnabled=1`, SDK CMake 4.x, JDK 17, `ANDROID_HOME`, and `CMAKE_POLICY_VERSION_MINIMUM=3.5` in the
  environment of `pnpm android` (Skia's CMakeLists declares `cmake_minimum_required 3.4.1`; PowerShell:
  `$env:CMAKE_POLICY_VERSION_MINIMUM='3.5'`). The plugin
  `plugins/with-android-cmake-dir.js` writes `cmake.dir` only on prebuild; an existing `android/` is not
  re-processed.
- Deep-link relaunch: `adb -s 3C081JEKB17021 shell "am start -p com.dafoggo.wattprint.dev -a android.intent.action.VIEW -d 'wattprint://?__expo_url=http%3A%2F%2Flocalhost%3A8081&__expo_disable_onboarding=1&__expo_disable_fab=1&__expo_disable_auto_launch=1'"`. The three builds share the `wattprint://` scheme, so a deep link without `-p com.dafoggo.wattprint.dev` may open another installed variant.
- Stop Metro after checking; do not leave it running.

## EAS

- Never run `eas build` or create credentials/keystores unless the user asks. The user runs `eas login`; the
  agent never handles credentials.
- Application ids: `com.dafoggo.wattprint` (production, in `app.json`), `.dev` (development) and `.preview`
  suffixes added by `app.config.ts`. Local `pnpm android` installs `com.dafoggo.wattprint.dev`; use it for
  `adb` commands. The id is cheap to change only until the first `eas build`.
- The first tab (`src/screens/home`) is the smart-home dashboard (mock data); the base checks (theme buttons, modal, sample
  form, SecureStore) live in `src/screens/settings`.
