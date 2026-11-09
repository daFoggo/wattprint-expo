# Data fetching

Backend: external FastAPI (no Expo `+api` routes). Test API for experiments: dummyjson.com (the example feature that used it was removed 2026-10-26). Sources and claim labels: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`.

## Rules

- All HTTP goes through `createApiClient` (`src/lib/http.ts`): Zod `schema` per call, timeout via AbortController linked to TanStack's `signal`, single-flight 401 refresh (retry once, re-read the token so a late 401 does not refresh twice), `onSessionExpired` when a refresh yields no token (once per refresh) or the retried request still gets 401. `auth: false` requests (login, the refresh call itself) send no token and never refresh. Never put tokens in URLs (the `onRequest` hook logs paths).
- Auth: Keycloak issues the tokens (`src/lib/auth-service.ts`: authorization code + PKCE, the browser step is injected from
  `src/lib/auth-client.ts` with `expo-auth-session`; realm URL `EXPO_PUBLIC_KEYCLOAK_URL`, default
  `http://localhost:11095/realms/wattprint`, reached on a phone with `adb reverse tcp:11095 tcp:11095`; redirect `wattprint://auth`,
  kept out of the router by `src/app/+native-intent.tsx`). The access token (RS256, 15 min) is the Bearer token for FastAPI
  (`EXPO_PUBLIC_API_URL`); the API client gets it from `fetchApiToken` (the service's `refreshAccessToken`) through
  `createTokenProvider` (`src/lib/auth-token.ts`: in memory, replaced 30 s before expiry, one fetch shared by concurrent
  callers). `src/lib/session.ts` builds the app's `apiClient` from it: a 401 triggers a refresh, and `onSessionExpired` makes one
  more refresh through the provider (its token stays cached) and signs the user out only when Keycloak rejected the refresh token
  (null); a network failure or 5xx keeps the user signed in; a refresh that throws (offline, timeout) never fires
  `onSessionExpired` nor a second refresh. Sign-in primes the provider with its access token (verified:
  `src/lib/auth-service.test.ts`, `src/lib/session.test.ts`). The token calls use form bodies outside `createApiClient` (they are
  the auth calls themselves). FastAPI errors use `{detail}`; Keycloak's `{error, error_description}` is mapped to `ApiError`.
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
- **Chat streaming**: fetch reader + own SSE parser with fixtures, abort via AbortController, final message via `setQueryData`; confirm on the phone when the chat feature starts.
