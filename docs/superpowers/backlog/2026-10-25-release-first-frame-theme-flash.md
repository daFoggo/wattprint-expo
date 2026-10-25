# First-frame theme flash in a release build

Opened: 2026-10-25. Source: HANDOFF "T4", `docs/performance.md` section 5.

## Why it matters

A stored dark theme should not flash light for one frame at launch.

## Facts (measured or verified)

- The root layout calls `Uniwind.setTheme(usePreferencesStore.getState().theme)` at module load and the provider repeats it in
  `useLayoutEffect` (verified: `src/app/_layout.tsx`, `src/components/ui/gluestack-ui-provider/index.tsx`).
- MMKV hydrates the store synchronously, so the value is available before render (verified: `docs/client-state.md` section 4).
- Device test T4 (first frame) was inconclusive in a dev build (HANDOFF). It was never run in a release build.

## Ideas (not verified)

- Idea: record the screen at launch with `adb shell screenrecord` on the emulator with the dark preference stored and the
  system theme light, and inspect the first frames.
- Unverified: whether the splash background (`#208AEF` in `app.json`) hides the difference.

## Start when

A release build is already being made for another check (for example the production-env check).

## Done when

A release-build recording at cold start with stored `dark` and system `light` shows no light frame, or the flash is
documented with a fix.

## Docs touched

`docs/performance.md` section 5, `docs/design-system.md` section 5.
