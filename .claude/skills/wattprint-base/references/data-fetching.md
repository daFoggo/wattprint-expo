# Data fetching digest

Use for any request to the FastAPI backend, query keys, cache timing, or a data screen. Full rules and measurements:
[docs/data-fetching.md](../../../../docs/data-fetching.md); numbers in [docs/performance.md](../../../../docs/performance.md#4-data-and-re-renders).

## Decision matrix

| Need                  | Pattern                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Any HTTP call         | Feature `<feature>/api.ts` calls `createApiClient` (`src/lib/http.ts`) with a Zod `schema` per call                                 |
| A failure             | Throw `ApiError`, `NetworkError` or `ContractError` (`src/lib/errors.ts`); never return fallback data                               |
| Retrying              | Only `isRetryable` (network, 5xx), fewer than 2 times; mutations never retry; `ContractError` never                                 |
| Query key             | Factory in `<feature>/queries.ts`; the key holds every variable `queryFn` uses                                                      |
| Freshness             | Defaults in `src/lib/query-client.ts` (`staleTime` 30 s); tune per query, never default to 0                                        |
| Detail screen         | Cached list row as `placeholderData`                                                                                                |
| Search box            | Debounce 300 ms with TanStack Pacer plus `keepPreviousData`                                                                         |
| Screen states         | `components/states/{loading,empty,error}-state`; paused offline is `OfflineState`; a failed refresh keeps cached data with a banner |
| Long lists            | FlashList v2 from a few hundred rows; row images use `expo-image` with `recyclingKey`                                               |
| Login or refresh call | `auth: false`: no token sent, never triggers a refresh                                                                              |

## Never do

- Return `[]`, `null` or a default object from `<feature>/api.ts` when the request fails.
- Set `staleTime: 0` as a default (opinion: a reopen or detail always refetches; the old measurement was removed).
- Put a token in a URL (the `onRequest` hook logs paths) or call `fetch` outside the client.
- Mirror query data into a Zustand store.

Not decided yet (read first): query persistence, auth and session store, chat streaming; each has a file in
[docs/superpowers/backlog](../../../../docs/superpowers/backlog/README.md).
