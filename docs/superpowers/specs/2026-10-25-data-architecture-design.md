# Data layer, architecture and benchmarks: design

Date: 2026-10-25. Status: approved by standing owner rule (no questions; "my calls" below). Source: planner (Opus) research, claims labelled V(url) = checked against that source, O = opinion or to confirm on device.

## Decision

Feature slices with thin routes. Expo has no official feature-based standard (skill guidance is type-based, routes only in `src/app`). A growing product (energy, dashboard, chat, auth) benefits from per-domain slices; a layered layout scatters one domain over five folders (O). Confirmed or reverted by the lab feature + benchmarks before `docs/architecture.md` locks it.

```
src/
  app/                routes only (params, render a screen, layouts, ErrorBoundary, +not-found)
  features/<name>/    api.ts (fetch + Zod, only caller of http client), schemas.ts, queries.ts (key factory + queryOptions),
                      mutations.ts, hooks/use-*.ts, components/, screens/*-screen.tsx, store.ts (if needed), colocated tests
  screens/            only screens composing 2+ features
  components/ui/      gluestack (hand-copied)   components/states/  loading, empty, error
  lib/                http, errors, query-client, online-manager, storage
  stores/             app-wide stores (preferences, session)      hooks/ i18n/ env.ts
```

Rules: a feature never imports `@/app`, `@/screens` or another feature. `lib/ stores/ hooks/ i18n/ env.ts` never import UI, features, screens or app. `components/` never imports features/screens/app. Inside a feature use `./` or `@/features/<self>/...`, never `../`. No barrel files in features (Metro evaluates all re-exports at startup, O: verify with Atlas). Extract to shared only when a second feature needs it. Enforce with core `no-restricted-imports` using `regex` patterns, one block per scope (later blocks replace earlier ones, so each lists everything), per-feature blocks generated from `src/features/*`; prove with `scripts/boundaries.test.ts` using `new ESLint().lintText(code, {filePath})` (confirm ESLint supports `regex`).

## G3 gaps (fix list)

1. High: `src/lib/query-client.ts` bare `new QueryClient()`. Add defaults: `staleTime 30_000` (O), `retry: (n, e) => isRetryable(e) && n < 2`, mutations retry 0. V(tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
2. High: no `onlineManager` wiring. `npx expo install expo-network`, `src/lib/online-manager.ts` per the TanStack RN guide recipe (listener + one-time `getNetworkStateAsync` only if no event yet, catch rejections). Needs native rebuild. V(tanstack.com/query/latest/docs/framework/react/react-native)
3. Med: no `ErrorBoundary` export in root layout (`ErrorBoundary`, `ErrorBoundaryProps` from `expo-router`). V(docs.expo.dev/router/error-handling)
4. Med: no `src/app/+not-found.tsx`.
5. Med: tabs have no nested Stack (no headers, no detail push). Folder per tab with `_layout.tsx` Stack; in SDK 58 a navigator only shows screens declared in its layout. V(docs.expo.dev/router/migrate/sdk-57-to-58)
6. Low-Med: `ThemeProvider` follows system scheme not stored preference; resolve `theme === 'system' ? colorScheme : theme` and build the nav theme from tokens.
7. Low: hard-coded English in layout/home -> `t()` keys (en, vi).
8. Low: error Text in sample-form not `selectable`.
9. Low: README note: expo-native-ui skill prefers inline styles/Color API; project deliberately uses Uniwind tokens (design-system skill: never a second system).
10. Info: `EXPO_PUBLIC_API_URL` per EAS profile, `expo-updates`/runtime version decided before first preview build.
Not gaps: keyboard (`adjustResize` already in manifest), splash gate (needed only once async SecureStore session hydration exists).

## Data-layer concepts

- HTTP: `src/lib/http.ts` `createApiClient({ baseUrl, getAccessToken, refreshAccessToken, onSessionExpired })` -> `request<T>(path, { schema, signal, method, body })`. Global `fetch` is `expo/fetch` on SDK 58 V(docs.expo.dev/versions/v58.0.0/sdk/expo). No axios. Timeout via AbortController linked to TanStack `signal` (O; check `AbortSignal.any` on Hermes).
- Errors (`src/lib/errors.ts`): `ApiError(status, detail, body)` (FastAPI `{detail: string}`, 422 `{detail:[{loc,msg,type}]}`, O), `NetworkError`, `ContractError` (Zod fail, never retried), `isRetryable` = network or 5xx. Throw, never return fallback data.
- Zod at the boundary: parse once in feature `api.ts`, keep only fields the UI uses; measure parse cost at 1000 rows.
- Auth (O): refresh token in SecureStore, access token in memory (non-persisted Zustand `session-store`); single-flight refresh on 401, retry once, clear session on failure; `Stack.Protected` guards; splash held until session hydrated. dummyjson has `/auth/login|me|refresh` for the lab.
- Query keys: factory + `queryOptions` per feature in `queries.ts`; key contains every variable `queryFn` uses. V(tanstack.com/query/latest/docs/framework/react/guides/query-keys, .../query-options)
- Persistence (decide after benchmarks): `@tanstack/react-query-persist-client` + `createAsyncStoragePersister` over MMKV (sync persister deprecated); `gcTime >= maxAge`; `buster` = app version; `resumePausedMutations` in `onSuccess`; persist only small dashboard summaries, not lists/chat. V(tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)
- Offline: `fetchStatus === 'paused'` is its own UI state. Screen focus: `subscribed: useIsFocused()` (`useFocusEffect/useIsFocused` from `expo-router`).
- Chat streaming: `res.body.getReader()` + `TextDecoder`; own pure SSE parser unit-tested with fixtures (RN has no EventSource, O); abort via AbortController (O: confirm on emulator); in-flight tokens in feature state, final message `setQueryData`. Chat list = FlashList v2 (`maintainVisibleContentPosition`, `startRenderingFromBottom`; no `inverted`).
- Navigation (O): NativeTabs `(dashboard)`, `(usage)`, `(chat)`, `settings` (max 5 on Android), each with own Stack, `(auth)` behind `Stack.Protected`, "add reading" as formSheet.
- States: every data screen has loading/empty/error/paused; failed refresh keeps cached content. Shared `components/states/*`; token-based placeholder (gluestack Skeleton is alpha, banned).
- Missing vs the Next repo (client side): http+errors, session/refresh/protected routes, ErrorBoundary/not-found, state components, toast, form-draft persistence + unsaved-changes guard (`beforeRemove` removed in SDK 58, confirm replacement), formatters (Hermes Intl), boundary lint, docs, fixtures, benchmark doc. Server-only parts and "stores per provider" (SSR) do not apply.

## Lab feature (throwaway trial, dummyjson)

Data: `/products` (194; `limit/skip/select/sortBy`, `/products/search?q=`, `/products/{id}`), `/quotes` (1454; source for 100/500/1000 lists), `?delay=0..5000`. Routes: hidden `lab` NativeTabs trigger (`hidden` when `EXPO_PUBLIC_APP_ENV==='production'`, first render only), `src/app/lab/{_layout,index,[id],bench}.tsx`. Feature files in `src/features/lab/`: `api.ts`, `schemas.ts`, `queries.ts`, `hooks/use-product-search.ts` (Pacer debounced value 300ms + `keepPreviousData`), `components/{product-row,quote-row,search-field}.tsx`, `screens/{products,product-detail,list-bench}-screen.tsx`, `bench/{bench-log,render-count}`, tests colocated. Keys: `labKeys.all/products/productList({q,limit})/product(id)/quotes(n)`; detail uses list row as `placeholderData` (measure with/without). Prereqs: lib/http+errors, query defaults, online manager, state components, ErrorBoundary+not-found, tab Stacks, `npx expo install @shopify/flash-list expo-image`.

## Benchmark method (emulator-5554 only; relative numbers, not device truth)

Builds: dev build for functional + re-render counts only (Profiler disabled in production React; dev JS timings invalid). Release-like: `npx expo run:android --variant release` (release signs with debug keystore, installs on emulator, replaces `.dev` debug install; `pnpm android` restores it; stop Metro, cold launch to prove embedded bundle). 5 runs each (10 for cold start), report median/min/max. `[BENCH]` console logs via `adb -s emulator-5554 logcat -d -s ReactNativeJS:V` (O: confirm release logs reach logcat).
1. Cache hit vs refetch: request log with timing; scenarios cold open, reopen within staleTime (0 requests), staleTime 0 (cached paint + 1 background request), detail with/without placeholder, `delay=1000`, optional persistence on/off after `am force-stop`.
2. FlashList vs FlatList at 100/500/1000: prefetch quotes, deep link `am start -p com.dafoggo.wattprint.dev -a android.intent.action.VIEW -d "wattprint://lab/bench?impl=flash&n=500"`; time to first row `onLayout`; `dumpsys gfxinfo` reset then 10x `input swipe 540 1800 540 300 80` -> janky % + p50/p90/p99; `dumpsys meminfo` PSS; FlashList `useBenchmark` only if it exists in installed types.
3. Cold start: `logcat -c`, `am start -S -W -n com.dafoggo.wattprint.dev/.MainActivity` (TotalTime); JS-ready vs `Displayed` with `logcat -v epoch`; base vs lab; persistence on/off.
4. Bundle: `npx expo export --platform android` (`.hbc` size), `EXPO_ATLAS=true ...` + `npx expo-atlas`, release APK size; base vs lab without/with FlashList.
5. Re-renders (dev build, Profiler commit counts): typing with/without debounce, refetch of unchanged data (structural sharing -> 0 row renders), tab switch with `subscribed` on/off; React Compiler is on.

## Execution order (each step has a check: pnpm check, format:check, expo-doctor, emulator + logcat no E)

1 G3 gaps 3-8. 2 lib/errors + lib/http + query defaults. 3 expo-network + online manager (native rebuild; airplane-mode check). 4 state components + boundary lint + `scripts/boundaries.test.ts`. 5 lab feature (FlashList, expo-image). 6 benchmarks -> `docs/benchmarks/`. 7 lock `docs/architecture.md`, `docs/data-fetching.md`, README note, AGENTS.md rules; Opus review. 8 persistence decision from numbers.

## Sources

tanstack.com/query/latest (react-native, important-defaults, query-keys, query-options, plugins/persistQueryClient, createAsyncStoragePersister); docs.expo.dev (versions/v58.0.0/sdk/expo, router/error-handling, router/migrate/sdk-57-to-58, guides/analyzing-bundles, guides/local-app-development); developer.android.com/topic/performance/vitals/launch-time; reactnative.dev/docs/performance; shopify.github.io/flash-list/docs/usage; eslint.org/docs/latest/rules/no-restricted-imports; dummyjson.com/docs (products, auth).
