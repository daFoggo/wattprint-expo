# Performance

What the official docs say, our rules, and the review checklist for lists, images, startup and bundle size.
Written 2026-10-25 against Expo SDK 58.0.19, React Native 0.88.0 (Hermes), React 19.3.0, `@shopify/flash-list` 2.3.2,
`expo-image` 58.0.17, `@tanstack/react-query` 5.104.5, Uniwind 1.13.0. Related:
[data-fetching.md](data-fetching.md) (cache and request rules), [architecture.md](architecture.md),
[components.md](components.md) (list rows), [client-state.md](client-state.md), [design-system.md](design-system.md).

Labels: **(verified: ...)** names the file or URL checked; **(inferred)** is reasoning; **(opinion)** is our choice.
The benchmark data this file once quoted (emulator measurements of 2026-10-25) was removed on 2026-10-26 together with the
benchmark scripts and screens. Claims that rested on it were **not re-measured** and are now labelled (opinion); no number
in this file is ours. A physical phone was never used.

## 1. Measure first, in a release build

- Dev mode costs JS performance ("suffers greatly" because of extra warnings and error checks), so measure in a release
  build (verified: <https://reactnative.dev/docs/performance>). FlashList's own page says the same (it can look slower than
  FlatList in dev) (verified: <https://shopify.github.io/flash-list/docs/fundamentals/performance>).
- If you measure: release build, emulator `Medium_Phone_API_37.0` only, several runs per cell, report median with min-max
  and the caveats; re-render counts need the dev build with the React Profiler because the Profiler is disabled in
  production React; never use dev-build timings (opinion).
- React Native warns that `console.*` in a bundled app is a JS-thread bottleneck (verified:
  <https://reactnative.dev/docs/performance>); keep `console.*` out of `src`.
- `am start -S -W` TotalTime is time to the first frame (Android's "time to initial display"), not useful content
  (verified: <https://developer.android.com/topic/performance/vitals/launch-time>).
- Do not claim "fast" without a measurement; say "relative, emulator".

## 2. Lists

**Rule (project):** FlashList v2 for lists that can pass a few hundred rows; FlatList is acceptable around 100 rows;
`ScrollView` only for short, bounded content (verified: `docs/data-fetching.md`).

This rule was set after a text-only emulator comparison of FlashList and FlatList at 100, 500 and 1000 rows. That data
was removed, the comparison was not repeated, and the ordering on a device is **unverified**; image rows were never
measured. Re-measure with image rows on a device before treating the rule as settled (opinion).

Rules from the official FlashList performance page (verified: <https://shopify.github.io/flash-list/docs/fundamentals/performance>):

- Memoizing props passed to FlashList matters more in v2; use `useCallback`/`useMemo`/`useRef` where it helps, and
  **measure before and after**. Wrap leaf components that do not depend on `item` in `memo`.
- Do not put `key` props on item components or their children; they stop recycling. When `map` needs keys inside a row,
  use `useMappingHelper`.
- Provide `getItemType` when row types differ a lot, so each type gets its own recycling pool.
- Keep per-row work cheap; memoize or remove heavy calculations in the row render path.

The example feature that held the only list screens was removed 2026-10-26, so no list in the repo is checked against these
rules now. The React Compiler is configured (section 6) and may memoize row components; that was **not** checked on compiled
output. Whether a refetch that returns identical data re-renders rows was not re-measured; structural sharing should keep
`data` stable (inferred). Until a measurement shows row re-renders, do not add manual memoization; for a new long list, hoist
`keyExtractor`, pass a stable `renderItem` and re-measure (opinion).

Other list rules (project): `keyboardShouldPersistTaps="handled"` on lists with inputs; pull to refresh through
`refreshing`/`onRefresh` (project rule); use the state components for loading, empty, error and paused.

## 3. Images

- Use `expo-image` in lists with `recyclingKey` (project rule). A recycled row would otherwise show the
  previous item's image until the new one loads; changing `recyclingKey` resets the view to blank or a placeholder first
  (verified: <https://docs.expo.dev/versions/latest/sdk/image/>). Use the item's stable id as the key.
- `cachePolicy` defaults to `'disk'`; `'memory-disk'` caches in memory with a disk fallback; `'memory'` may be purged quickly
  (verified: same page).
- Give every image fixed dimensions through classes (`size-16`) so layout does not shift. Set `accessible={false}` on
  decorative thumbnails.
- Wrap `expo-image` with `withUniwind` once so `className` works; a second feature using it
  should move it to `src/components` ([components.md](components.md))).
- Not measured: image decode cost, scroll jank with images, disk cache size. Open item in the backlog (image rows on a
  device).

## 4. Data and re-renders

Behaviour below follows from the query options in `src/lib/query-client.ts`; the timings
once measured for it were removed and not re-measured (opinion):

- The cache is memory-only, so every cold launch refetches.
- Inside `staleTime` (30 s) a reopen should cost no request and paint from cache; with `staleTime: 0` a reopen always
  refetches. Do not default `staleTime` to 0.
- A detail screen with the cached list row as `placeholderData` shows content immediately instead of waiting for the network.
- A search debounce (300 ms) should reduce fetches for fast typing; real typing speed was not measured.
- Switching tabs should not refetch or re-render a data screen.

Rules (project, from [data-fetching.md](data-fetching.md)): per-query `staleTime`, `placeholderData` from list rows, debounce
search with Pacer plus `keepPreviousData`, no mirrored query data in stores.

## 5. Cold start and the first frame

- No cold-start numbers are kept: the earlier measurement was removed and not repeated. Do not add features to cold start
  without measuring a release build (opinion).
- **Theme before the first frame:** the root layout calls `Uniwind.setTheme(usePreferencesStore.getState().theme)` at module
  load, before any render; MMKV reads are synchronous, so the stored theme is already in the store (verified:
  `src/app/_layout.tsx`, [client-state.md](client-state.md) section 4). The provider repeats it in `useLayoutEffect`. Whether the
  first frame of a **release** build still flashes the wrong theme is open: it was inconclusive in a dev build (HANDOFF, "T4")
  and is a backlog item.
- Keep work out of the root layout: it currently initialises i18n, the online manager and the query client, and nothing
  that awaits. An async session hydration (auth, later) is the point at which the splash screen should be held until ready
  (spec: "splash gate needed only once async SecureStore session hydration exists").
- `expo-splash-screen` is configured in `app.json`; the project does not call `preventAutoHideAsync` (verified: grep of `src`).

## 6. Hermes and React Compiler status in this project

- **Hermes:** the default engine; "no additional configuration is required" (verified:
  <https://reactnative.dev/docs/hermes>). `app.json` has no `jsEngine` override (verified: file).
- **React Compiler:** `experiments.reactCompiler: true` in `app.json` (verified: file). On SDK 54 and later Babel is configured
  automatically, no extra package is needed (verified: <https://docs.expo.dev/guides/react-compiler/>). The repo has no
  `babel.config.js`, and `scripts/config-guard.test.ts` forbids one (verified). `babel-plugin-react-compiler` 1.0.0 is installed
  in `node_modules` and `babel-preset-expo` reads a `react-compiler` option (verified: `node_modules`). The docs say
  `eslint-config-expo` includes the compiler's rules from SDK 55 (verified: same page), so `pnpm lint` covers them.
  **Not verified:** that the compiler transformed our files in a build . Check with `EXPO_ATLAS=true` output or a compiled-output inspection before relying on automatic memoization.
- **New Architecture** is on (verified: `README.md`).

## 7. Bundle and app size

- Tool: Expo Atlas. `EXPO_ATLAS=true npx expo export --platform android`, then `npx expo-atlas .expo/atlas.jsonl`
  (also `EXPO_ATLAS=true npx expo start`, Shift+M). It shows each library's contribution to the production bundle
  (verified: <https://docs.expo.dev/guides/analyzing-bundles/>). The `atlas.jsonl` contains every bundled module's source
  and inlined `EXPO_PUBLIC_` values: treat it like source code and never commit or share it (same page).
- Caveat: `EXPO_ATLAS=true` can auto-add `expo-atlas` to `package.json`; revert it after measuring.
- No bundle or APK sizes are kept: the earlier figures were removed and not re-measured. Measure with Atlas before
  claiming a size change (opinion).
- Barrels: no barrel files in features (unverified benefit; free to avoid). If a barrel is proposed, check import cost with
  Atlas ([architecture.md](architecture.md) "Open").

## 8. Release-build measurement method (checklist for a perf claim)

1. Record the commit, build variant and device (emulator AVD `Medium_Phone_API_37.0`; the phone is never used).
2. Build release: `npx expo run:android --variant release --no-bundler`; confirm Metro is off (port 8081 not listening) and the
   embedded bundle renders (screenshot).
3. Control the cache state (cold: `am force-stop`; warm: data already fetched) and say which one each number is.
4. Run n >= 5 per cell, 10 for cold start, alternate A/B order, report median and min-max.
5. Quote numbers with their caveats and label them measured, inferred or opinion.
6. Revert all temporary instrumentation (`git diff` of `src/` empty).
7. Restore the debug app with `pnpm android` afterwards and stop Metro.

## Checklist (review of a change that can affect speed)

- [ ] Lists that can exceed a few hundred rows use FlashList v2; `keyExtractor` hoisted; no `key` inside rows.
- [ ] Row images use `expo-image`, `recyclingKey` = stable id, fixed size, `cachePolicy` stated.
- [ ] No new `console.*` in `src`.
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

- React Native performance and Hermes: <https://reactnative.dev/docs/performance>, <https://reactnative.dev/docs/hermes>.
- FlashList performance: <https://shopify.github.io/flash-list/docs/fundamentals/performance>.
- expo-image: <https://docs.expo.dev/versions/latest/sdk/image/>.
- Expo Atlas: <https://docs.expo.dev/guides/analyzing-bundles/>; React Compiler: <https://docs.expo.dev/guides/react-compiler/>.
- Android launch time: <https://developer.android.com/topic/performance/vitals/launch-time>.
