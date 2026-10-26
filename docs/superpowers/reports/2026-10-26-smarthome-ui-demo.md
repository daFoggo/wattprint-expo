# Smarthome UI demo report

Date: 2026-10-26. Commits: `git log --oneline 11739ea..HEAD` (Task 1 `dea1298` to Task 8 `62166b9`, plus this report). Closes the spec
[smarthome-ui-demo-design](../specs/2026-10-26-smarthome-ui-demo-design.md) and the plan
`docs/superpowers/plans/2026-10-26-smarthome-ui-demo.md`.

## Status

Done for the UI demo; the Phase B/C Opus review is done and its must-fix items are fixed (see "Review outcome"). Four tabs run on the physical phone: Home (dashboard), Devices, Energy
(victory-native chart) and Settings (the former base checks). Data is static mock data validated by Zod; there is no backend. Gate
results (G1, G2, G3, run once at the end on 2026-10-26) are in "Gate results" below. Device evidence is from Task 7 and was not re-run
for this report, by the user's instruction.

## What exists

- Routes: `src/app/(home)`, `(devices)`, `(energy)`, `(settings)`, each a folder with a `_layout.tsx` Stack; `src/app/_layout.tsx` wraps
  `NativeTabs` in `DeviceStatesProvider`.
- Slices: `src/features/devices` (schemas, mock data, selectors, `device-states.tsx`, `DeviceRow`, room components, screen) and
  `src/features/energy` (schemas, mock data, selectors, `EnergyChart`, range switch, summary and top-device cards, screen); no feature
  imports another.
- Screens: `src/screens/home` (composes both slices; scenes are plain selection state), `src/screens/settings` (theme, form, modal,
  SecureStore).
- Shared: `src/lib/format.ts` (number and currency formatting); vendored parts `card`, `switch`, `badge`, `progress`, `heading`, `text`,
  `pressable`, `divider` under `src/components/ui`.
- Packages: `@shopify/react-native-skia` 2.14.0, `victory-native` 42.0.1, `@expo/html-elements` 58.0.3 (verified: `README.md` "Pinned
  versions").
- Backlog: [victory-native 43 upgrade](../backlog/2026-10-26-victory-native-43-upgrade.md),
  [font scale and dark Switch findings](../backlog/2026-10-26-font-scale-and-dark-switch-findings.md),
  [CMake policy variable](../backlog/2026-10-26-cmake-policy-env-option.md).

## Review outcome

- Phase A (Tasks 1 and 2): reviewed by an Opus reviewer; its fixes are in `802d98e` (switch thumb contrast, Switch guard, `line-clamp-1`,
  CMake and victory-native pin docs). It also found two stale doc claims (the `forwardRef` file list and the `dark:` pair list), fixed in
  the docs commit `62166b9`.
- Phase B and C (Tasks 3 to 9) and the whole branch: reviewed by Opus. Must-fix items were fixed in the fix wave (commit
  `fix(app): apply Opus review fixes to devices, energy and switch thumb`): per-range top devices that no longer exceed the range
  total (and `shareOf` clamped to 0..100); `watts` split into `ratedWatts` and live draw, with `countOn` counting on and online
  devices only; chart and row accessibility labels built from i18n keys; `formatCurrency` with the currency deciding the digits; the
  dark Switch thumb token; single dimming of offline rows. Nice-to-have items are deferred to
  [the review backlog](../backlog/2026-10-26-phase-bc-review-deferred.md): RadioGroup extraction of the three segmented-choice
  blocks, the Settings in-page title that duplicates the Stack header, the implicit link between mock names, and Hermes `Intl`
  currency formatting (unverified on a device).
- Device check (Task 7, physical phone `3C081JEKB17021`, app `com.dafoggo.wattprint.dev`): all four tabs rendered without errors in light, dark,
  Vietnamese and font scale 2.0 (rendering without errors is not the same as correct: see the review findings below). Tapping a device row toggles it and the Home current draw updates; an offline row does not toggle.
  `adb logcat -d ReactNativeJS:V *:S` had 0 `E` lines. Screenshots are not committed; they are in the session scratchpad
  `C:\Users\Foggo\AppData\Local\Temp\claude\D--Dev-Projects-wattprint-expo\4748404d-1eff-4e81-ab2d-cdbf639729b6\scratchpad`, named
  `task7-<tab>-<light|dark|vi|font2>.png`, plus `task7-devices-tap-name.png`, `task7-devices-tap-offline.png`,
  `task7-home-after-toggle.png` and `task7-energy-back-to-light.png`.
- Issues the Task 7 check did not catch, found by the Opus review and fixed in the fix wave (verified: jest tests added for each, and
  a phone check after the fix, see the fix-wave commit): (1) one `topDevices` list was shared by all ranges, so top devices exceeded
  the totals (Day total about 14.29 kWh against a water heater of 18.4 kWh); (2) `watts` meant both rated power and live draw, so the
  row number did not follow the toggle; (3) the dark Switch thumb was invisible (`accent-card` on `card`, 1.00:1).
- Not exercised: `line-clamp-1` (no screen uses `isTruncated`) and a release build.

## Decisions and deviations

- **Skia peer mismatch (Task 1).** victory-native 43.x peers on the unscoped `react-native-skia >=2.15.1`, which would install a second Skia
  next to Expo's pinned 2.14.0; we pin 42.0.1 (peer `@shopify/react-native-skia >=2.6.0 <3.0.0`). Risk: 42 uses the deprecated
  gesture-handler `Gesture` builder (verified: `README.md` "victory-native is pinned to 42.0.1", the backlog file above).
- **Verification device changed (user, 2026-10-26).** The plan said emulator `emulator-5554`; the user moved checks to the physical phone
  (`adb reverse`, `localhost:8081` deep link). The emulator stays an optional fallback; emulator builds are x86 and the phone is ARM
  (verified: `AGENTS.md` "Device verification"). Docs and the skill were updated to match.
- **Skia needs `CMAKE_POLICY_VERSION_MINIMUM=3.5`** with SDK CMake 4.x; documented, not automated (backlog file above).
- **Vendored part deviations** (gluestack Uniwind template, stable pins): `switch` colour bindings with a `switch-thumb` token thumb, `badge` destructive
  text token, `text` and `heading` drop `highlight`, `text` `isTruncated` is `line-clamp-1`, `pressable` base is only the disabled opacity.
  Full list: `README.md` "gluestack-ui".
- **Base checks moved to Settings**; Home became the dashboard (my call).
- **No language switcher** (my call): `vi` and `en` follow the system or per-app locale; the Settings tab has no language control.
- **Scenes without side effects** (my call): Home scenes only mark a selection and do not change device state (verified:
  `src/screens/home/index.tsx`).
- **`src/lib/format.ts` created up front** (my call) because Home, Devices and Energy all format numbers.
- **Slice role names are placeholders** in the docs (`<feature>/api.ts`); `schemas.ts` was removed from `NOT_PATHS` (a real file exists), while `api.ts` and `queries.ts` stay
  there only for the 2026-10-25 data-architecture spec, a point-in-time record.
- Single-feature screens live in `src/features/<name>/screens`, not `src/screens` (`docs/architecture.md` wins, as the plan states).

## Deferred

- Native bottom-tab labels truncate at font scale 2.0 ("Trang c...", "Năng l..."): the `NativeTabs` bar is native and was left alone.
  [font scale and dark Switch findings](../backlog/2026-10-26-font-scale-and-dark-switch-findings.md).
- Dark-mode Switch thumb: fixed in the fix wave with the `--switch-thumb` token (dark thumb vs card 4.36, vs on track 3.85). The thumb
  vs off track stays 1.44 in dark by design; the thumb position and the track vs card carry the state
  ([backlog](../backlog/2026-10-26-font-scale-and-dark-switch-findings.md)).
- `line-clamp-1` (`isTruncated`) is unverified on a device (same file).
- GestureDetector deprecation risk: victory-native 42 uses the legacy `Gesture` builder, and the pnpm peer range will not warn when RNGH
  removes it. [victory-native 43 upgrade](../backlog/2026-10-26-victory-native-43-upgrade.md).
- The `CMAKE_POLICY_VERSION_MINIMUM=3.5` requirement and a possible plugin or Gradle option:
  [CMake policy variable](../backlog/2026-10-26-cmake-policy-env-option.md).
- Opus Phase B and C nice-to-have items (RadioGroup extraction, Settings title duplicate, mock-name link, Hermes `Intl` currency):
  [review backlog](../backlog/2026-10-26-phase-bc-review-deferred.md).

## Docs changed

`AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/architecture.md`, `docs/components.md`, `docs/design-system.md`, `docs/client-state.md`,
`docs/data-fetching.md`, `docs/performance.md`, `docs/superpowers/HANDOFF.md`, the skill `.claude/skills/wattprint-base` (SKILL, references,
a new eval "device-row-with-switch"), `scripts/docs-links.test.ts`, `docs/superpowers/reports/README.md` and the three backlog files above. The fix wave also updated
`docs/design-system.md` (Switch thumb token and its limit, home title, pressable row sentence), `README.md` (gluestack deviations) and
added the review backlog file.
The global `gluestack-ui-v5` skill was not touched: no rule it states changed (this repo's hand-copy rules live in `AGENTS.md` and `README.md`).

## Gate results

Run from the repo root on 2026-10-26, with this report and the backlog files already in the working tree:

- G1 `pnpm check`: exit 0. ESLint with `--max-warnings 0` and `tsc --noEmit` passed; jest: 43 suites passed, 364 tests passed.
- G2 `pnpm format:check`: "All matched files use Prettier code style!" (exit 0).
- G3 `npx expo-doctor`: "20/20 checks passed. No issues detected!" (exit 0).
- No device run for this report: the Task 7 evidence above is cited instead.

## Next

Define the backend contract (FastAPI `/openapi.json`) and replace the mock data of `devices` and `energy` with `<feature>/api.ts` and
`<feature>/queries.ts`. Read `docs/data-fetching.md` first.
