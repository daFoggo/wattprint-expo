# Data fetching

Backend: external FastAPI (no Expo `+api` routes). Test API for experiments: dummyjson.com (`src/features/lab`). Sources and claim labels: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`. Measurements: `docs/benchmarks/2026-10-25-baseline.md` (emulator, relative only).

## Rules

- All HTTP goes through `createApiClient` (`src/lib/http.ts`): Zod `schema` per call, timeout via AbortController linked to TanStack's `signal`, single-flight 401 refresh (retry once, re-read the token so a late 401 does not refresh twice), `onSessionExpired` when a refresh yields no token (once per refresh) or the retried request still gets 401. `auth: false` requests (login, the refresh call itself) send no token and never refresh. Never put tokens in URLs (the `onRequest` hook logs paths).
- Errors (`src/lib/errors.ts`): `ApiError` (FastAPI `{detail}` string or 422 list), `NetworkError`, `ContractError` (never retried). Throw; never return fallback data. `isRetryable` = network or 5xx.
- One feature `api.ts` calls the client and parses; `queries.ts` holds the key factory and `queryOptions`; the key contains every variable `queryFn` uses.
- Query defaults (`src/lib/query-client.ts`): `staleTime 30_000`, `retry` only if retryable and < 2, mutations never retry. Tune `staleTime` per query; do not default it to 0 (measured: opening a detail from the list made 2 requests instead of 1, and reopening within 30 s made 2 instead of 0).
- Detail screens use the cached list row as `placeholderData` (measured on the emulator, n=5: first content in ~5 ms; with a warm connection the real data arrives at ~76 ms, and with a 1000 ms server delay at ~1.3 s, so the placeholder hides the whole request).
- Search inputs: debounce with TanStack Pacer (300 ms) plus `keepPreviousData`.
- Connectivity: `initOnlineManager` (expo-network); focus: `useAppStateFocus`; gate screen polling with `subscribed: useIsFocused()` when needed.
- Every data screen renders loading, empty, error and paused states (`components/states`; paused uses `OfflineState`, built on `EmptyState`; the bench screen is exempt); a failed refresh keeps showing cached data with a banner.
- Long lists (a few hundred rows or more): FlashList v2. At ~100 rows no difference was measurable, so FlatList is acceptable there. (Measured on the x86_64 emulator, n=5 per cell, ~420 frames each, text-only rows: janky frames ~1% vs ~5% at 500/1000, FlatList +40 MB PSS at 500/1000, +7 MB at 100; frame percentiles equal. Re-measure with image rows on a device.)
- Images in recycled lists: `expo-image` with `recyclingKey`.

## Not decided yet

- **Query persistence** (MMKV + `@tanstack/react-query-persist-client` with `@tanstack/query-async-storage-persister`): deferred. Benefit is about 0.6-1.0 s on a cold list open on the emulator over the host network (inferred; likely larger on mobile networks); hydration cost is unmeasured. Spike only when a real read-mostly screen (dashboard summary) exists: measure hydration, set `maxAge` (`gcTime >= maxAge`), `buster` = app version, persist only small summaries, never chat or large lists.
- **Auth/session store** and `Stack.Protected` (design in the spec; build with the first FastAPI integration).
- **Chat streaming**: fetch reader + own SSE parser with fixtures, abort via AbortController, final message via `setQueryData`; confirm on emulator when the chat feature starts.
