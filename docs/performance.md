# Performance

What we measured, what the official docs say, and the review checklist for lists, images, startup and bundle size.
Written 2026-10-25 against Expo SDK 58.0.19, React Native 0.88.0 (Hermes), React 19.3.0, `@shopify/flash-list` 2.3.2,
`expo-image` 58.0.17, `@tanstack/react-query` 5.104.5, Uniwind 1.13.0. Related:
[data-fetching.md](data-fetching.md) (cache and request rules), [architecture.md](architecture.md),
[components.md](components.md) (list rows), [client-state.md](client-state.md), [design-system.md](design-system.md),
benchmark data in [benchmarks/2026-10-25-baseline.md](benchmarks/2026-10-25-baseline.md).

Labels: **(measured)** comes from `docs/benchmarks/raw/` through the baseline document; **(verified: ...)** names the
file or URL checked; **(inferred)** is reasoning on a measurement; **(opinion)** is our choice. All numbers below are from
the baseline: an x86_64 emulator on a desktop CPU, so they are relative, never a prediction for a phone. No number in this
file is new; each is quoted with its caveat.

## 1. Measure first, in a release build

- Dev mode costs JS performance ("suffers greatly" because of extra warnings and error checks), so measure in a release
  build (verified: <https://reactnative.dev/docs/performance>). FlashList's own page says the same (it can look slower than
  FlatList in dev) (verified: <https://shopify.github.io/flash-list/docs/fundamentals/performance>).
- Our method (verified: baseline "Commands"): `npx expo run:android --variant release --no-bundler` (debug keystore, Metro off),
  emulator `emulator-5554` only, 5 runs per cell (10 for cold start), report median with min-max, alternate A/B order per
  run, scripts in `scripts/bench/` (`cold-start.sh`, `list-bench.sh`, `cache-bench.sh`, `resume-bench.sh`, `rerender.sh`,
  `stats.js`). Re-render counts use the dev build with the React Profiler because the Profiler is disabled in production React
  (verified: spec "Benchmark method"); never use dev-build timings.
- `[BENCH]` logs (`src/lib/bench-log.ts`) are on in every env except `production`; each is one greppable line:
  `adb -s emulator-5554 logcat -d -s ReactNativeJS:V | grep BENCH`. React Native warns that `console.*` in a bundled app is a
  JS-thread bottleneck (verified: <https://reactnative.dev/docs/performance>). `benchLog` returns before logging when
  `EXPO_PUBLIC_APP_ENV=production` (verified: `bench-log.ts`) and is the only `console.*` call in `src` (verified: grep).
  Whether a production build is silent was **not** checked on a build (baseline "Caveats").
- What the numbers mean: `am start -S -W` TotalTime is time to the first frame (Android's "time to initial display"),
  not useful content (verified: <https://developer.android.com/topic/performance/vitals/launch-time>, baseline caveats).
  `home-ready` is the root layout effect, after mount, not after pixels.
- A physical phone was never used. Do not claim "fast" without a measurement; say "relative, emulator".

## 2. Lists

**Rule (project):** FlashList v2 for lists that can pass a few hundred rows; FlatList is acceptable around 100 rows;
`ScrollView` only for short, bounded content (verified: `docs/data-fetching.md`).

Measured on the emulator, release build, prefetched data, text-only rows, 5 runs per cell, about 420 frames each
(verified: baseline section 2). Medians:

| rows | impl      | janky %          | PSS MB | first native layout ms |
| ---- | --------- | ---------------- | ------ | ---------------------- |
| 100  | FlashList | 3.09 (2.75-4.91) | 121.1  | 18                     |
| 100  | FlatList  | 4.59 (4.15-5.33) | 128.1  | 11                     |
| 500  | FlashList | 1.15 (0.49-2.91) | 128.1  | 21                     |
| 500  | FlatList  | 5.18 (4.75-5.75) | 169.2  | 10                     |
| 1000 | FlashList | 1.15 (0.92-2.38) | 129.3  | 21                     |
| 1000 | FlatList  | 5.78 (5.21-6.47) | 168.2  | 11                     |

Reading with the baseline's caveats: janky % is lower for FlashList at 500 and 1000 (ranges do not overlap) and not
distinguishable at 100; frame percentiles sit at the 60 Hz floor for both and p99 ranges overlap everywhere; FlatList uses
about 40 MB more PSS at 500 and 1000 and 7 MB more at 100; FlatList's first layout is about 10 ms earlier. **Rows were
text only; image rows were not measured**, and the ordering on a device is **unverified**. This is why `data-fetching.md`
says to re-measure with image rows on a device before locking it.

Rules from the official FlashList performance page (verified: <https://shopify.github.io/flash-list/docs/fundamentals/performance>):

- Memoizing props passed to FlashList matters more in v2; use `useCallback`/`useMemo`/`useRef` where it helps, and
  **measure before and after**. Wrap leaf components that do not depend on `item` in `memo`.
- Do not put `key` props on item components or their children; they stop recycling. When `map` needs keys inside a row,
  use `useMappingHelper`.
- Provide `getItemType` when row types differ a lot, so each type gets its own recycling pool.
- Keep per-row work cheap; memoize or remove heavy calculations in the row render path.

Where our code stands (verified by reading the files):

| File                                                   | Status                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `features/lab/screens/products-screen.tsx`             | `keyExtractor` is an inline arrow, `renderItem` is an inline arrow that creates an `onPress` closure; `ProductRow` is not wrapped in `memo` |
| `features/lab/screens/list-bench-screen.tsx`           | `keyExtractor` hoisted to module level; `renderItem` rebuilt every render; `onFirstRowLayout` in `useCallback` |
| `features/lab/components/product-row.tsx`, `quote-row` | no `key` props inside rows; `ProductRow` has `recyclingKey` on the image                                  |

The React Compiler is configured (section 6) and may memoize these; that was **not** checked on the compiled output.
The one re-render measurement we have: a refetch that returns identical data re-rendered 0 rows (dev build, Profiler,
baseline section 5), so structural sharing keeps `data` stable (inferred). Until a measurement shows row re-renders, do not
add manual memoization to the lab screens; for a new long list, hoist `keyExtractor`, pass a stable `renderItem` and
re-measure (opinion).

Other list rules (project): `keyboardShouldPersistTaps="handled"` on lists with inputs; pull to refresh through
`refreshing`/`onRefresh` (verified: `products-screen.tsx`); use the state components for loading, empty, error and paused.

## 3. Images

- Use `expo-image` in lists with `recyclingKey` (project rule, verified: `product-row.tsx`). A recycled row would otherwise show the
  previous item's image until the new one loads; changing `recyclingKey` resets the view to blank or a placeholder first
  (verified: <https://docs.expo.dev/versions/latest/sdk/image/>). Use the item's stable id as the key.
- `cachePolicy` defaults to `'disk'`; `'memory-disk'` caches in memory with a disk fallback; `'memory'` may be purged quickly
  (verified: same page). `ProductRow` sets `memory-disk`.
- Give every image fixed dimensions through classes (`size-16`) so layout does not shift. Set `accessible={false}` on
  decorative thumbnails (verified: `product-row.tsx`).
- Wrap `expo-image` with `withUniwind` once (`StyledImage` in `src/features/lab/components/styled-image.tsx`, shared by `product-row.tsx` and
  `product-detail-screen.tsx`; it was defined twice before the review fix) so `className` works; a second feature using it
  should move it to `src/components` ([components.md](components.md))).
- Not measured: image decode cost, scroll jank with images, disk cache size. Open item in the backlog (image rows on a
  device).

## 4. Data and re-renders

Measured (baseline sections 1 and 5; emulator; dummyjson through the host network, whose first request of a process takes
600-1000 ms and later ones 75-90 ms):

- A cold list view needs one network round trip and shows content at about 0.96 s (median); the cache is memory-only, so
  every cold launch refetches.
- Inside `staleTime` (30 s) a reopen costs 0 requests and paints from cache in about 4 ms; with `staleTime: 0` the same
  reopen always refetches. Do not default `staleTime` to 0 (measured: 2 requests instead of 1 when opening a detail).
- A detail screen with the cached list row as `placeholderData` shows content at about 5 ms, versus about 696 ms when opened
  with nothing cached. That comparison is confounded by the cold process and first TLS connection; the 1000 ms-delay rows
  (5 ms vs 1930 ms) are not.
- Search debounce 300 ms: one fetch for a fast single `input text` burst vs 2 (range 1-3) with no debounce; at one key
  per 0.5 s it saves nothing (5 and 5). Real typing speed was not measured.
- Switching Settings and back caused 0 fetches and 0 renders of the products screen.

Rules (project, from [data-fetching.md](data-fetching.md)): per-query `staleTime`, `placeholderData` from list rows, debounce
search with Pacer plus `keepPreviousData`, no mirrored query data in stores.

## 5. Cold start and the first frame

- Measured cold start (release build A, n=10, baseline section 3): TotalTime median 511.5 ms (min 381, max 547); JS ready
  (`home-ready`) median 674 ms (min 657, max 737). In that build the Lab tab mounts at startup, so a products request ran
  during start (content about 0.9-1.0 s after launch). Run 9 (381 ms) is an unexplained low outlier. The page cache was warm
  (process cold, files not).
- **Theme before the first frame:** the root layout calls `Uniwind.setTheme(usePreferencesStore.getState().theme)` at module
  load, before any render; MMKV reads are synchronous, so the stored theme is already in the store (verified:
  `src/app/_layout.tsx`, [client-state.md](client-state.md) section 4). The provider repeats it in `useLayoutEffect`. Whether the
  first frame of a **release** build still flashes the wrong theme is open: it was inconclusive in a dev build (HANDOFF, "T4")
  and is a backlog item.
- Keep work out of the root layout: it currently initialises i18n, the online manager and the query client, and nothing
  that awaits. An async session hydration (auth, later) is the point at which the splash screen should be held until ready
  (spec: "splash gate needed only once async SecureStore session hydration exists").
- `expo-splash-screen` is configured in `app.json`; the project does not call `preventAutoHideAsync` (verified: grep of `src`).
- Do not add features to cold start without re-running `scripts/bench/cold-start.sh` in a release build.

## 6. Hermes and React Compiler status in this project

- **Hermes:** the default engine; "no additional configuration is required" (verified:
  <https://reactnative.dev/docs/hermes>). `app.json` has no `jsEngine` override (verified: file). The baseline environment lists
  Hermes and the release bundle is an `.hbc` file (baseline section 4).
- **React Compiler:** `experiments.reactCompiler: true` in `app.json` (verified: file). On SDK 54 and later Babel is configured
  automatically, no extra package is needed (verified: <https://docs.expo.dev/guides/react-compiler/>). The repo has no
  `babel.config.js`, and `scripts/config-guard.test.ts` forbids one (verified). `babel-plugin-react-compiler` 1.0.0 is installed
  in `node_modules` and `babel-preset-expo` reads a `react-compiler` option (verified: `node_modules`). The docs say
  `eslint-config-expo` includes the compiler's rules from SDK 55 (verified: same page), so `pnpm lint` covers them.
  **Not verified:** that the compiler transformed our files in a build (the baseline says its status "was not re-checked in this
  run"). Check with `EXPO_ATLAS=true` output or a compiled-output inspection before relying on automatic memoization.
- **New Architecture** is on (verified: `README.md`).

## 7. Bundle and app size

- Tool: Expo Atlas. `EXPO_ATLAS=true npx expo export --platform android`, then `npx expo-atlas .expo/atlas.jsonl`
  (also `EXPO_ATLAS=true npx expo start`, Shift+M). It shows each library's contribution to the production bundle
  (verified: <https://docs.expo.dev/guides/analyzing-bundles/>). The `atlas.jsonl` contains every bundled module's source
  and inlined `EXPO_PUBLIC_` values: treat it like source code and never commit or share it (same page).
- Caveat: `EXPO_ATLAS=true` auto-added `expo-atlas` to `package.json` in the baseline run; revert it after measuring
  (baseline section 4).
- Measured (baseline section 4): `.hbc` from `expo export` 6,028,322 bytes with the lab vs 5,841,341 before it (+186,981,
  +3.2%); universal release APK 108,200,013 bytes (4 ABIs; arm64-v8a 25.6 MB compressed); Atlas JS before Hermes
  9,149,558 to 9,494,138 bytes (+3.8%). Largest packages: react-native 1.59 MB, react-native-reanimated 1.43 MB, expo-router
  1.23 MB, zod 0.94 MB. FlashList added about 233 KB of pre-Hermes JS. Caveats: Atlas sizes are relative; the `.hbc` inside the
  APK (4,916,460) differs from the `export` file and the reason was not investigated; no single-ABI APK was built (a
  36-37 MB arm64 APK is **inferred**).
- Barrels: no barrel files in features (unverified benefit; free to avoid). If a barrel is proposed, check import cost with
  Atlas ([architecture.md](architecture.md) "Open").

## 8. Release-build measurement method (checklist for a perf claim)

1. Record the commit, build variant and device (emulator AVD `Medium_Phone_API_37.0`; the phone is never used).
2. Build release: `npx expo run:android --variant release --no-bundler`; confirm Metro is off (port 8081 not listening) and the
   embedded bundle renders (screenshot).
3. Control the cache state (cold: `am force-stop`; warm: prefetch) and say which one each number is.
4. Run n >= 5 per cell, 10 for cold start, alternate A/B order, report median and min-max, keep the raw CSV in
   `docs/benchmarks/raw/`.
5. Quote numbers with their caveats and label them measured, inferred or opinion. Put the document in `docs/benchmarks/`.
6. Revert all instrumentation (`git diff` of `src/` empty) or keep it behind `benchLog`.
7. Restore the debug app with `pnpm android` afterwards and stop Metro.

## Checklist (review of a change that can affect speed)

- [ ] Lists that can exceed a few hundred rows use FlashList v2; `keyExtractor` hoisted; no `key` inside rows.
- [ ] Row images use `expo-image`, `recyclingKey` = stable id, fixed size, `cachePolicy` stated.
- [ ] No new `console.*`; logging goes through `benchLog` or is removed.
- [ ] No awaiting work in the root layout; no new startup request without a reason.
- [ ] `staleTime` set per query; `placeholderData` from list rows where a detail exists.
- [ ] New dependency: checked its size with Expo Atlas (relative) and justified it.
- [ ] Any "faster" claim has a release-build measurement with n, median, range and caveats, or is labelled opinion.
- [ ] Manual `memo`/`useCallback` only where a measurement showed row re-renders (the compiler is on).

## Anti-patterns

- Judging speed from a dev build, or from one run.
- Using `inverted` for the future chat list; the design in the spec is `maintainVisibleContentPosition` and `startRenderingFromBottom` (unverified until the chat feature starts).
- `key={...}` on items inside a FlashList row.
- `console.log` in render or in the request path.
- Reporting a percentage without the sample size and range.
- Committing `.expo/atlas.jsonl` or the `expo-atlas` dependency added by the measurement run.
- Persisting the whole query cache without measuring hydration (not measured; see `data-fetching.md`).

## Sources

- Our measurements: `docs/benchmarks/2026-10-25-baseline.md`, `docs/benchmarks/raw/`, `scripts/bench/`.
- React Native performance and Hermes: <https://reactnative.dev/docs/performance>, <https://reactnative.dev/docs/hermes>.
- FlashList performance: <https://shopify.github.io/flash-list/docs/fundamentals/performance>.
- expo-image: <https://docs.expo.dev/versions/latest/sdk/image/>.
- Expo Atlas: <https://docs.expo.dev/guides/analyzing-bundles/>; React Compiler: <https://docs.expo.dev/guides/react-compiler/>.
- Android launch time: <https://developer.android.com/topic/performance/vitals/launch-time>.
