# Data fetching

Backend: external FastAPI (no Expo `+api` routes). Test API for experiments: dummyjson.com (the example feature that used it was removed 2026-10-26). Sources and claim labels: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`.

## Rules

- All HTTP goes through `createApiClient` (`src/lib/http.ts`): Zod `schema` per call, timeout via AbortController linked to TanStack's `signal`, single-flight 401 refresh (retry once, re-read the token so a late 401 does not refresh twice), `onSessionExpired` when a refresh yields no token (once per refresh) or the retried request still gets 401. `auth: false` requests (login, the refresh call itself) send no token and never refresh. Never put tokens in URLs (the `onRequest` hook logs paths).
- Auth: Better Auth issues the session; the API client gets its Bearer JWT from `authClient.token()` through
  `createTokenProvider` (`src/lib/auth-token.ts`: in memory, replaced 30 s before expiry, one fetch shared by concurrent
  callers). `src/lib/session.ts` builds the app's `apiClient` from it: a 401 triggers a refresh via `authClient.token()`,
  and `onSessionExpired` signs the user out only when the server confirms there is no session (a network failure keeps
  the user signed in). FastAPI verifies the JWT against the auth service's JWKS (verified:
  `docs/superpowers/specs/2026-10-30-better-auth-integration-design.md`).
- Errors (`src/lib/errors.ts`): `ApiError` (FastAPI `{detail}` string or 422 list), `NetworkError`, `ContractError` (never retried). Throw; never return fallback data. `isRetryable` = network or 5xx.
- One `<feature>/api.ts` calls the client and parses; `<feature>/queries.ts` holds the key factory and `queryOptions`; the key contains every variable `queryFn` uses.
- Query defaults (`src/lib/query-client.ts`): `staleTime 30_000`, `retry` only if retryable and < 2, mutations never retry. Tune `staleTime` per query; do not default it to 0 (opinion: with 0 a reopen or a detail opened from the list always refetches; an earlier emulator measurement of this was removed and not repeated).
- Detail screens use the cached list row as `placeholderData` (opinion: first content shows at once while the real request runs; an earlier emulator measurement was removed and not repeated).
- Search inputs: debounce with TanStack Pacer (300 ms) plus `keepPreviousData`.
- Connectivity: `initOnlineManager` (expo-network); focus: `useAppStateFocus`; gate screen polling with `subscribed: useIsFocused()` when needed.
- Every data screen renders loading, empty, error and paused states (`components/states`; paused uses `OfflineState`, built on `EmptyState`); a failed refresh keeps showing cached data with a banner.
- Long lists (a few hundred rows or more): FlashList v2. FlatList is acceptable around ~100 rows. (opinion: an earlier text-only emulator comparison favoured FlashList at 500 and 1000 rows; that data was removed and not repeated. Measure with image rows on a device.)
- Images in recycled lists: `expo-image` with `recyclingKey`.

## Not decided yet

- **Query persistence** (MMKV + `@tanstack/react-query-persist-client` with `@tanstack/query-async-storage-persister`): deferred. The benefit (skipping a cold refetch) and the hydration cost are both unmeasured. Spike only when a real read-mostly screen (dashboard summary) exists: measure hydration, set `maxAge` (`gcTime >= maxAge`), `buster` = app version, persist only small summaries, never chat or large lists.
- **Auth/session store** and `Stack.Protected` (design in the spec; build with the first FastAPI integration).
- **Chat streaming**: fetch reader + own SSE parser with fixtures, abort via AbortController, final message via `setQueryData`; confirm on the phone when the chat feature starts.
