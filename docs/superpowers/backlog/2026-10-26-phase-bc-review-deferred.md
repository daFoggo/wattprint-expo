# Phase B and C review: deferred nice-to-have items

Opened: 2026-10-26. Source: Opus review of Phases B and C of the smarthome UI demo (must-fix items were fixed in the fix wave).

## Why it matters
Four review points were judged not worth the demo's time; each is small but could grow when real features arrive.

## Facts (measured or verified)
- Three hand-written segmented-choice blocks exist (`EnergyRangeSwitch`, the
  Settings theme buttons, the Home scenes) with the same selected-state pattern (verified: `src/features/energy/components/energy-range-switch.tsx`,
  `src/screens/settings/index.tsx`, `src/screens/home/index.tsx`).
- The Settings screen draws an in-page title that repeats the Stack header title (verified: `src/screens/settings/index.tsx`, `src/app/(settings)/_layout.tsx`).
- Top-device names in the energy mock repeat the device names and ids of the devices mock by hand; no test links them
  (verified: `src/features/energy/mock-data.ts`, `src/features/devices/mock-data.ts`).
- Currency uses `Intl.NumberFormat` with `style: 'currency'`; Jest runs it on Node, not Hermes (verified: `src/lib/format.test.ts`).

## Ideas (not verified)
- idea: extract a `RadioGroup` (or one segmented-choice part) once a fourth use appears, by the "second feature needs it" rule.
- idea: drop the Settings in-page title or the Stack header title, not both.
- idea: a test that every energy `topDevices` id exists in the devices mock, until the backend owns both.
- unverified: that Hermes on the phone prints the same VND and USD strings as Node for `en` and `vi`; check `formatCurrency` on a device.

## Start when
A fourth segmented choice is needed, Settings gets a real header design, the mock data is edited again, or the app is run in release on a device.

## Done when
- One shared segmented-choice part replaces the three blocks and `pnpm check` passes.
- Settings shows one title; the mock-link test exists; a phone screenshot shows the VND cost in `en` and `vi`.

## Docs touched
`docs/components.md` (if a RadioGroup part is added), `docs/design-system.md`.
