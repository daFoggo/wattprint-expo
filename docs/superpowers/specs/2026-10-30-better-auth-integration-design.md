# Better Auth integration (Expo app + FastAPI backend)

Date: 2026-10-30. Status: draft, awaiting approval. Written against Expo SDK 58 / RN 0.88, Better Auth docs read
2026-10-30 (the Expo page targets SDK 55; re-check on SDK 58), `wattprint-fastapi` as of its current working tree.
Related: `docs/superpowers/backlog/2026-10-25-auth-session-store.md`, `docs/client-state.md`, `docs/data-fetching.md`,
`docs/architecture.md`.

docs/backend/ (a local draft, not in git, 2026-10-28) proposes hand-written `/auth/*` endpoints with a refresh-token pair. It is
**superseded** by this design: Better Auth is the only auth system. Do not read its auth section as a contract.

## Intent

The user signs in on the phone, stays signed in across launches, and every call to FastAPI carries proof of who they are,
verified by FastAPI without calling the auth service on each request. Better Auth is the single source of identity; we write
no custom login, token or refresh endpoints.

## Goals

- Email and password sign-up, sign-in, sign-out in the Expo app, through the existing Better Auth service.
- Session persisted in SecureStore (Better Auth `expoClient`), available offline at launch.
- App sends `Authorization: Bearer <JWT>` to FastAPI through the existing `createApiClient`.
- FastAPI verifies the JWT locally (JWKS) and exposes the same `CurrentUser` dependency to routers.
- Protected routes in the app (`Stack.Protected`), splash held until the session state is known.

## Non-goals

Social login (Google, Apple), email verification, password reset, roles and organizations, refresh-token rotation of our own,
MMKV or any persisted store holding tokens, production deployment of the auth service, polished auth UI (functional,
token-themed screens only).

## Anti-goals

- Writing custom crypto, password hashing, session or refresh logic.
- A JWT or session token in MMKV, Zustand persist, logs or URLs (`docs/client-state.md` sections 1 and 4).
- FastAPI calling the auth service on every request (the reason for the JWT plugin).
- Shipping the dev `exp://**` trusted-origin wildcards to production.

## Constraints

- Better Auth is TypeScript only; it stays the separate Node/Hono service in `wattprint-fastapi/auth/` (verified:
  auth/src/auth.ts (FastAPI repo), auth/src/index.ts). It already has `expo()`, `bearer()`, email/password, schema `auth`.
- `better-auth` and `@better-auth/expo` must be the same version in the app and the service. The service has `^1.4`;
  `next-mono-base` runs 1.7.11. Pin one version on both sides after checking it supports the Expo SDK 58 setup.
- Install in the app with `npx expo install` (AGENTS.md); no `expo-web-browser` (only needed for social login).
- Physical phone `3C081JEKB17021` reaches the services with `adb reverse` (`tcp:3000` auth, `tcp:8000` API), same trick as
  Metro; the app uses `http://localhost:<port>` in dev. Cleartext HTTP to localhost on the dev build must be confirmed.
- Import boundaries and file rules from AGENTS.md apply (`src/app` routes only, kebab-case, i18n en and vi, no hex colours).
- JWT `iss` must equal the public `BETTER_AUTH_URL` (what the phone uses), but FastAPI inside Docker fetches JWKS from
  `http://auth:3000`: issuer and JWKS URL are two separate settings.

## Approaches considered

| | Approach | Trade-off |
| --- | --- | --- |
| A | Keep FastAPI forwarding cookie or bearer to `/api/auth/get-session` | Works today; one extra HTTP and DB read per request, API down when auth is down, off the documented path for a separate backend |
| **B** | **`jwt()` plugin: app sends JWT, FastAPI verifies via JWKS** | Documented path for external services (verified: better-auth.com/docs/plugins/jwt); needs plugin, `jwks` table, FastAPI verify code; JWT lives 15 min by default |
| C | FastAPI reads `auth.session` in Postgres | Couples FastAPI to Better Auth's internal schema; rejected |

Chosen by the user: **B**. (Chosen over A because it matches Better Auth's own guidance and `next-mono-base`.)

## Design (approach B)

### Auth service (`wattprint-fastapi/auth/`)

- Add `jwt()` from `better-auth/plugins` with `issuer = BETTER_AUTH_URL`, `audience = API_AUDIENCE`
  (e.g. `wattprint-api`), `definePayload` limited to `name`, `email`, `emailVerified`; subject is the user id.
  Default key algorithm EdDSA (Ed25519), default expiry 15 minutes (kept).
- `npm run migrate` (`getMigrations`) creates the `jwks` table in schema `auth` (to verify against a running DB).
- Keep `expo()` and `bearer()` (bearer stays; the Expo client uses it only through `expoClient`'s own handling).
- `trustedOrigins`: `wattprint://` in all environments, dev wildcards only when `NODE_ENV !== 'production'` (already so).
- New env: `API_AUDIENCE`.

### FastAPI (`wattprint-fastapi/backend/`)

- New dependency `PyJWT[crypto]`. `app/core/security.py`: `get_current_user` reads `Authorization: Bearer`, verifies the
  signature with `PyJWKClient(JWKS_URL)` (cached keys, refetch on unknown `kid`), checks `iss`, `aud`, `exp`, `sub`, and
  returns the same `AuthUser`. `PyJWKClient` is blocking: run it off the event loop. 401 on missing, invalid or expired
  token; 503 only when JWKS cannot be fetched and no cached key matches.
- Settings: `auth_jwks_url` (default `http://localhost:3000/api/auth/jwks`), `auth_issuer`, `auth_audience`.
  Remove the cookie forwarding and the `get-session` call; `CurrentUser` keeps its name so routers do not change.
- Tests with a locally generated Ed25519 key and a stubbed JWKS: valid, expired, wrong `aud`, wrong `iss`, unknown `kid`,
  missing header. Existing `/me` 401 test stays.
- Compose passes `AUTH_JWKS_URL=http://auth:3000/api/auth/jwks`, `AUTH_ISSUER=${BETTER_AUTH_URL}`, `AUTH_AUDIENCE`.

### Expo app (`wattprint-expo/`)

- Dependencies: `better-auth`, `@better-auth/expo` (same pinned version as the service). `expo-secure-store`,
  `expo-network`, `expo-linking` already installed.
- `src/lib/auth-client.ts`: `createAuthClient({ baseURL, plugins: [expoClient({ scheme: 'wattprint', storagePrefix:
  'wattprint', storage: SecureStore }), jwtClient()] })`. `EXPO_PUBLIC_AUTH_URL` added to `src/env.ts` (static access).
- Access token: held in memory only (module-level cache with its `exp` read from the payload, no persistence).
  `getAccessToken` returns the cached JWT or fetches one with `authClient.token()` when absent or within ~30 s of expiry;
  `refreshAccessToken` forces a new `authClient.token()`; `onSessionExpired` signs out locally and routes to sign-in.
  The `createApiClient` instance gets its `baseUrl` from `EXPO_PUBLIC_API_URL` (`/api/v1`).
- Session state: `authClient.useSession()` drives gating (it is cached in SecureStore, so launch works offline). Root layout
  holds the splash until `isPending` is false and uses `Stack.Protected` with an `(auth)` group (sign-in, sign-up) and the
  existing tabs behind the guard.
- Screens in src/screens/auth (sign-in, sign-up) with feature code in src/features/auth (schemas with Zod, hooks);
  strings in `en.json` and `vi.json`; settings screen gets a sign-out row.
- Sign-out: `authClient.signOut()`, clear the in-memory token, `queryClient.clear()`, reset user-scoped stores
  (`docs/client-state.md` section 6). Device-scoped preferences stay.
- Errors: Better Auth client errors are mapped to the existing error vocabulary at the auth feature boundary; the shared
  `createApiClient` is not used for `authClient` calls.

## Verification

- FastAPI: `pytest` with the cases above. Auth service: sign-up, sign-in and `GET /api/auth/jwks` and `/api/auth/token`
  checked with `curl` against `docker compose up`.
- Expo: `pnpm check`, `pnpm format:check`, `npx expo-doctor`; unit tests for the token cache (reuse, near-expiry refetch,
  single-flight) and sign-out cleanup; on the phone: sign up, kill and relaunch (still signed in), call `/api/v1/me`,
  sign out, expired-token path, logcat without `E ReactNativeJS` lines. Report real output, including failures.

## Docs touched (Expo repo)

`docs/client-state.md` (session and token rules), `docs/data-fetching.md` (auth client and token source),
`docs/architecture.md` (features/auth), `README.md` and `.env.example` (`EXPO_PUBLIC_AUTH_URL`), `AGENTS.md` Device
verification (`adb reverse` for auth and API), the `wattprint-base` skill, and the auth backlog item is closed in a report.
In `wattprint-fastapi`: `README.md` (env, JWT flow).

## Calls made while writing (settled by the assistant after the reviewer check; change any you disagree with)

1. **Expired JWT vs dead session.** `refreshAccessToken` calls `authClient.token()`. Only an auth rejection (401) from it
   counts as a dead session: then `onSessionExpired` fires, the local session is cleared and the user lands on sign-in.
   A network failure or timeout keeps the user signed in (offline launch must keep working); the failed API request is
   reported as a 401 and is not retried (accepted after review: `createApiClient` turns a failed refresh into a 401). An unknown `kid` after key rotation is handled by the FastAPI JWKS refetch, not the app.
2. **User data in FastAPI.** This work covers `/me` only. No `users` table and no foreign key into the `auth` schema;
   future user-scoped tables key on the JWT `sub` (opinion, revisit with the first such table).
3. **Stale claims.** Name, email and `emailVerified` in the JWT can lag by up to 15 minutes; accepted.
4. **Versions.** No upgrade of the auth service: the app pins the exact `better-auth` and `@better-auth/expo` versions the
   service already resolves, so existing dev data is untouched. Only the `jwks` table is added.
5. **Migration.** The `auth` container already runs `npm run migrate` on start (verified: docker-compose.yml (FastAPI repo)) with the
   `POSTGRES_USER` role, so the `jwks` table appears on the next `docker compose up`.
6. **Issuer.** One issuer only: `BETTER_AUTH_URL`, `http://localhost:3000` in dev. The emulator and phone both use
   `adb reverse`, so there is no second origin.
7. **Sign-out reset.** Nothing user-scoped exists yet (`preferences-store` is device-scoped), so sign-out is
   `authClient.signOut()`, clearing the token cache and `queryClient.clear()`.

## Left to the builder

Exact Better Auth version pin, file names within the stated folders, form validation messages, token cache refetch margin,
whether `bearer()` can be dropped once the flow works, screen layout inside the existing design tokens.

## Open risks

- Expo page was written for SDK 55; SDK 58 behaviour of `expoClient` is unverified until installed.
- `authClient.token()` on native depends on the session cookie being attached by `expoClient`; verify on the phone first.
- Python JWKS verification is a community pattern, not an official Better Auth guide.
- Cleartext `http://localhost` from the dev build via `adb reverse` is expected to work, unverified.
