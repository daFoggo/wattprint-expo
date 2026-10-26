# victory-native 43 upgrade

Opened: 2026-10-26. Source: Task 1 of the smarthome UI demo plan and its Phase A review.

## Why it matters
`victory-native` is pinned to 42.0.1 because 43.x would install a second Skia copy. 42 relies on a deprecated gesture-handler API.

## Facts (measured or verified)
- 43.0.1 peers on the unscoped `react-native-skia >=2.15.1 <3.0.0` and `react-native-gesture-handler >=2.0.0 <4.0.0` (verified: `npm view victory-native@43.0.1 peerDependencies`).
- Expo SDK 58 pins `@shopify/react-native-skia` 2.14.0 (verified: `node_modules/expo/bundledNativeModules.json`).
- 42.0.1 peers on `@shopify/react-native-skia >=2.6.0 <3.0.0` and `react-native-gesture-handler >=2.0.0`, no upper bound (verified: `node_modules/victory-native/package.json`).
- 42.0.1 builds its pan gesture with `Gesture.Pan()` (verified: `node_modules/victory-native/dist/cartesian/CartesianChart.js`).
- RNGH 3.3.0 still exports `Gesture`, and its v3 `GestureDetector` falls back to `LegacyGestureDetector` (verified: `node_modules/react-native-gesture-handler/lib/module/v3/detectors/GestureDetector.js`).

## Ideas (not verified)
- idea: when RNGH removes the legacy builder, the chart gestures break without any pnpm peer warning; a test that renders the chart with a gesture would catch it.

## Start when
Expo bumps `@shopify/react-native-skia` to 2.15.1 or later, or RNGH drops the legacy `Gesture` builder, whichever comes first.

## Done when
- `pnpm why @shopify/react-native-skia` shows one copy and no unscoped `react-native-skia`.
- `pnpm check` and `npx expo-doctor` pass, and the energy chart renders and responds to a press on the emulator.

## Docs touched
`README.md` (Decisions and the version table) and `docs/superpowers/specs/2026-10-26-smarthome-ui-demo-design.md` if the chart changes.
