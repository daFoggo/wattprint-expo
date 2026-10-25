# Auth and session store

Opened: 2026-10-25. Source: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`, `docs/data-fetching.md`.

## Why it matters

The FastAPI backend needs login, token refresh and protected routes. `createApiClient` already supports `auth: false`,
single-flight refresh and `onSessionExpired`, but nothing provides the tokens.

## Facts (measured or verified)

- `src/lib/http.ts` takes `getAccessToken`, `refreshAccessToken` and `onSessionExpired` (verified: file, `data-fetching.md`).
- Design in the spec: refresh token in SecureStore, access token in memory (a non-persisted Zustand `session-store`),
  `Stack.Protected` guards, splash held until the session hydrates.
- SecureStore reads can be synchronous (blocking) or async; Android data is not kept on uninstall
  (verified: <https://docs.expo.dev/versions/latest/sdk/securestore/>).
- Logout rules for stores: `docs/client-state.md` section 6.

## Ideas (not verified)

- Idea: the dummyjson `/auth/login|me|refresh` endpoints can exercise the flow in the lab before FastAPI is ready.
- Unverified: the exact FastAPI auth contract. Read `/openapi.json` of the backend first; do not guess endpoints.

## Start when

The first FastAPI endpoint that needs a token is integrated.

## Done when

Login, refresh on 401, logout (store reset, SecureStore cleared, `queryClient.clear()`) and an expired session are covered
by tests, protected routes work on the emulator, and logcat has no `E ReactNativeJS` lines.

## Docs touched

`docs/client-state.md`, `docs/data-fetching.md`, `docs/architecture.md` (`stores/session`), `AGENTS.md` if a rule changes.
