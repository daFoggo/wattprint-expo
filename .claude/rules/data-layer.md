---
paths:
  - 'src/lib/http.ts'
  - 'src/lib/errors.ts'
  - 'src/lib/query-client.ts'
  - 'src/features/**/{api,schemas,queries}.ts'
  - 'src/features/**/hooks/**'
---

# Data layer: rules an agent must not miss

Source of truth: docs/data-fetching.md. Unknown endpoint: read the backend `/openapi.json`, never guess.

- All HTTP goes through `createApiClient` with a Zod `schema`. Failures throw `ApiError`, `NetworkError` or `ContractError`; never return fallback or empty data.
- Retry only `isRetryable` errors (network, 5xx). Default `staleTime` is 30 s, never 0.
- Per feature: `api.ts`, `schemas.ts`, `queries.ts` (key factory + `queryOptions`); no barrel files; share code only when a second feature needs it.
- Query data is never copied into a Zustand store.
- Data screens render `components/states/{loading,empty,error}-state` (paused: `OfflineState`); keep cached data when a refresh fails.
- New logic gets a colocated jest test.
