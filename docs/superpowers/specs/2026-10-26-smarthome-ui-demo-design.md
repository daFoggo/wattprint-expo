# Smarthome dashboard and energy tracking: UI-only demo (design)

Written against Expo SDK 58, RN 0.88, Uniwind, gluestack-ui v5 (hand-copied parts). Related:
[architecture](../../architecture.md), [components](../../components.md), [design-system](../../design-system.md),
[data-fetching](../../data-fetching.md), [HANDOFF](../HANDOFF.md).

## Intent

A pure-UI demo of a smart-home dashboard with energy tracking, to exercise the base (gluestack parts, Uniwind tokens,
composition, native tabs, dark mode, i18n en/vi) on the Android emulator before real features and the FastAPI backend.
No network, no backend. Data is static mock data validated by Zod so the shapes can later be swapped for API responses.

Note 2026-10-26: device verification moved from the emulator to the physical phone (`3C081JEKB17021`); see the report and `AGENTS.md`.

## Goals

- Tabs: **Home**, **Devices**, **Energy**, plus the existing **Settings** (theme and language stay).
- Home: greeting, current power draw, today's usage and cost, quick scenes, a few room summaries.
- Devices: devices grouped by room, per-device on/off with local state, status badge, current watts.
- Energy: day/week/month range switch, usage chart, top consuming devices, simple cost summary.
- Compose gluestack parts (Card, Switch, Badge, Progress, Heading, Text, Pressable, Divider, Button) and compound
  components per the Vercel composition rules; no custom re-implementation of a part gluestack provides.

## Non-goals and anti-goals

- No real device control, auth, API calls, persistence, push, or charts bound to live data.
- No alpha gluestack components (Tabs, Table, BottomSheet, Calendar, Skeleton, Grid, ...).
- Not a failure-looking demo: no hard-coded colours, no boolean look props, no feature importing another feature.

## Constraints

- Follow AGENTS.md: feature slices under `src/features/<name>` (no barrels, no cross-feature imports), routes thin in
  `src/app`, screens in `src/screens`, tokens only, 48 dp targets, i18n keys in en and vi, `ref` as a prop,
  `npx expo install` only, gluestack parts hand-copied (never the CLI; see README) with stable pins.
- Cross-feature composition happens in `src/screens` (Home shows summaries from devices and energy).
- Done = `pnpm check`, `pnpm format:check`, `npx expo-doctor`, emulator screenshot and logcat without `E` lines.
- Docs, skill and README change in the same commit as any rule they state.

## Approaches

Chart library (the only real fork; gluestack has no chart part):

1. `react-native-gifted-charts` (SVG): lowest risk, adds `expo-linear-gradient`. Not chosen.
2. `victory-native` (Skia): GPU-drawn, gesture-friendly, heavier setup. **Chosen by the user.**
3. Hand-drawn `react-native-svg`: contradicts "no re-inventing". Rejected.

Skia caveat (unverified): `victory-native` 43.0.1 declares Skia `>=2.15.1` while npm shows `@shopify/react-native-skia`
2.14.0 as latest. Which Skia Expo 58 pins is unknown. First plan task is a gate: `npx expo install
@shopify/react-native-skia`, add `victory-native`, run on the emulator. If it does not work, stop and report; fallback is
gifted-charts (user decision).
Note 2026-10-26: Task 1 outcome: `victory-native` 42.0.1 was used (43.x peers on unscoped `react-native-skia >=2.15.1`); see the README Decisions.

## Decided by me (check these)

- Keep the Settings tab (4 tabs) instead of dropping it.
- Mock data in `src/features/{devices,energy}/mock-data.ts` with `schemas.ts`; device on/off state is local
  `useState`/small hook, not a store, not persisted.
- A chart is wrapped once in the energy feature's `components/` folder as a compound part with token-driven colours (Skia takes
  colour values, so read them through the theme hook, not hex literals; guard test must stay green).
- Extra gluestack parts are hand-copied from the cached Uniwind template; any part with no stable upstream is skipped
  and its need met by composing existing parts.

## Left to the builder

Exact layout and spacing, mock values, icon choices (`md`/`sf` names for tabs, gluestack `Icon` with SVG paths for
inline icons), i18n copy, test selection, and how the home summaries are assembled in `src/screens`.

## Process

planner (Opus) writes the plan; implementer (Sonnet) per task; scout (Haiku) for lookups; reviewer (Opus) after each
phase and at the end; real command output reported.
