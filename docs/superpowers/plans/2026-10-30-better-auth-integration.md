# Better Auth integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Expo app signs users in through the existing Better Auth service and calls FastAPI with a JWT that FastAPI verifies locally via JWKS.

**Architecture:** Auth service adds the `jwt()` plugin. FastAPI replaces its `get-session` forwarding with JWT verification (`PyJWKClient`). The app keeps the session in SecureStore (`expoClient`), holds the JWT in memory only, and feeds `createApiClient` through a small token provider. Routes are gated with `Stack.Protected`.

**Tech Stack:** Better Auth (`better-auth`, `@better-auth/expo`), Hono/Node (auth service), FastAPI + PyJWT[crypto] + pytest, Expo SDK 58, Expo Router, Zustand-free (state from `authClient.useSession()`), Jest, Zod, i18next.

**Spec:** `docs/superpowers/specs/2026-10-30-better-auth-integration-design.md` (read it first; it lists risks and the calls already made).

Repos: **FAPI** = `D:\Dev_Projects\wattprint-fastapi` (tasks 1-2), **APP** = `D:\Dev_Projects\wattprint-expo` (tasks 3-7).
Roles (CLAUDE.md global): implement with `implementer` (Sonnet), review each task and the branch with `reviewer` (Opus).

## Global Constraints

- Better Auth is the only auth system; no custom login, token, hashing or refresh endpoints.
- `better-auth` and `@better-auth/expo` are the same exact version in FAPI `auth/package.json` and APP `package.json`; the service is not upgraded (spec call 4).
- JWT: issuer `BETTER_AUTH_URL` (`http://localhost:3000` in dev), audience `API_AUDIENCE` (`wattprint-api`), EdDSA (Ed25519), 15 minute expiry, payload `name`, `email`, `emailVerified`, subject = user id.
- Tokens only in memory or SecureStore (via `expoClient`); never MMKV, Zustand persist, logs or URLs.
- APP rules (AGENTS.md): `src/app` routes only; kebab-case files; Uniwind semantic tokens only; i18n keys in `en.json` and `vi.json`; boundaries (`lib` imports no components/features/screens/app; features import no other feature or `../`); install with `npx expo install`; conventional commits, never bypass hooks; env via static `process.env.EXPO_PUBLIC_X` in `src/env.ts`.
- APP "Done": `pnpm check`, `pnpm format:check`, `npx expo-doctor`, and phone verification on `3C081JEKB17021` with `adb -s 3C081JEKB17021`; report real output. Never run `eas build`.
- FAPI: Python >=3.12, ruff line length 100, pytest asyncio_mode auto; `get_current_user`/`CurrentUser`/`AuthUser` names and the `AuthUser` fields (`id`, `email`, `name`, `email_verified`) stay.

## Review Focus

1. A JWT signed with `alg=HS256` or `none` (algorithm confusion) must be rejected with 401, not accepted.
2. A lower-case `bearer` scheme or an empty/malformed `Authorization` value returns 401, not a 500.
3. Network failure while refreshing the JWT must not sign the user out; an auth rejection must.
4. After sign-out, the next user must never reuse the previous user's cached JWT or cached query data.
5. Launching offline with a stored session shows the tabs (not the sign-in screen); double-tapping Submit sends one request; a wrong password or an already-used email shows a readable error.

---

## File Structure

FAPI: modify `auth/src/auth.ts`, `auth/package.json`, `backend/app/core/security.py`, `backend/app/core/config.py`, `backend/pyproject.toml`, `docker-compose.yml`, `.env.example`, `README.md`; create `backend/tests/test_security.py`.

APP: create `src/lib/auth-client.ts` (Better Auth client + `fetchApiToken`), `src/lib/auth-token.ts` (token provider, pure), `src/lib/session.ts` (api client instance, sign-out, expired handler), `src/features/auth/schemas.ts`, `src/features/auth/hooks/use-sign-in.ts`, `use-sign-up.ts`, `use-sign-out.ts`, `src/screens/auth/sign-in.tsx`, `sign-up.tsx`, route files `src/app/(auth)/_layout.tsx`, `sign-in.tsx`, `sign-up.tsx`; modify `src/env.ts`, `.env.example`, `src/app/_layout.tsx`, move the four tab folders into `src/app/(app)/` with a new `(app)/_layout.tsx` holding the `NativeTabs`, `src/screens/settings/index.tsx`, `src/i18n/locales/{en,vi}.json`, docs listed in task 7.

---

### Task 1: FastAPI verifies the JWT (FAPI)

**Files:**
- Modify: `backend/app/core/security.py`, `backend/app/core/config.py`, `backend/pyproject.toml`
- Create: `backend/tests/test_security.py`

**Interfaces:**
- Produces: `settings.auth_jwks_url: str` (default `http://localhost:3000/api/auth/jwks`), `settings.auth_issuer: str` (default `http://localhost:3000`), `settings.auth_audience: str` (default `wattprint-api`); `get_jwk_client() -> PyJWKClient` (lru_cached, overridable via `app.dependency_overrides`); `get_current_user(request: Request, jwk_client: PyJWKClient = Depends(get_jwk_client)) -> AuthUser`; `CurrentUser` unchanged. Remove the `get-session` code, `httpx` use and `auth_service_url`/`auth_base_path`.

- [ ] **Step 0:** In FAPI run `git status`; if it is not a git repo, skip commit steps and tell the user.
- [ ] **Step 1: Write failing tests** in `backend/tests/test_security.py`. Build an Ed25519 key with `cryptography`, sign tokens with `jwt.encode(..., algorithm="EdDSA", headers={"kid": "k1"})`, override `get_jwk_client` with a fake exposing `get_signing_key_from_jwt(token)` returning an object with `.key` (the public key) and raising `jwt.PyJWKClientError` for kid `unknown`. Tests, all hitting `GET /api/v1/me` through `TestClient`: `test_valid_token_returns_user` (200, body has `id` = `sub`, `email`, `name`), `test_user_without_name_is_ok`, `test_expired_token_401`, `test_wrong_audience_401`, `test_wrong_issuer_401`, `test_unknown_kid_401`, `test_hs256_token_signed_with_public_key_bytes_401`, `test_alg_none_401`, `test_missing_header_401`, `test_empty_bearer_401`, `test_lowercase_bearer_scheme_200` (scheme is case-insensitive per RFC 7235), `test_jwks_unreachable_503` (fake raises `jwt.PyJWKClientConnectionError`).
- [ ] **Step 2:** Run `uv run pytest tests/test_security.py -v` in `backend/`. Expected: FAIL (old implementation calls the network).
- [ ] **Step 3:** Add `PyJWT[crypto]>=2.9` to `pyproject.toml` dependencies (`httpx` stays only if still used elsewhere; otherwise move to dev group). Add the three settings. Implement `get_jwk_client` and `get_current_user` in `security.py`: parse `Authorization` (case-insensitive `Bearer`), run `get_signing_key_from_jwt` via `starlette.concurrency.run_in_threadpool`, `jwt.decode(token, key, algorithms=["EdDSA"], issuer=..., audience=..., options={"require": ["exp", "sub", "iss", "aud"]}, leeway=10)`; map `PyJWKClientConnectionError` to 503 `Auth service unavailable`, every other `jwt.PyJWTError` to 401 `Invalid or expired token`. Build `AuthUser` from claims (`email_verified` from `emailVerified`).
- [ ] **Step 4:** Run `uv run pytest -v` and `uv run ruff check .` in `backend/`. Expected: all pass, including the existing two tests.
- [ ] **Step 5: Commit** in FAPI: `feat(auth): verify Better Auth JWTs with JWKS`.

### Task 2: Auth service issues JWTs (FAPI)

**Files:**
- Modify: `auth/src/auth.ts`, `auth/package.json`, `docker-compose.yml`, `.env.example`, `README.md`

**Interfaces:**
- Produces: `GET {BETTER_AUTH_URL}/api/auth/jwks`, `GET /api/auth/token` (with session), env `API_AUDIENCE`.

- [ ] **Step 1:** Determine the version the service resolves today (`docker compose run --rm auth npm ls better-auth @better-auth/expo`, or the lockfile) and pin both packages in `auth/package.json` to that exact version (no caret). Record it in the commit message; Task 3 uses the same value.
- [ ] **Step 2:** In `auth/src/auth.ts` add `jwt({ jwt: { issuer: process.env.BETTER_AUTH_URL, audience: process.env.API_AUDIENCE, definePayload: ({ user }) => ({ name: user.name, email: user.email, emailVerified: user.emailVerified }) } })` to `plugins` (import from `better-auth/plugins`); keep `expo()` and `bearer()`. Add `wattprint://` to the documented `EXPO_APP_SCHEMES` value.
- [ ] **Step 3:** `docker-compose.yml`: pass `API_AUDIENCE` to `auth`; pass `AUTH_JWKS_URL=http://auth:3000/api/auth/jwks`, `AUTH_ISSUER=${BETTER_AUTH_URL}`, `AUTH_AUDIENCE=${API_AUDIENCE}` to `api`, and drop `AUTH_SERVICE_URL`. `.env.example`: add `API_AUDIENCE=wattprint-api`, set `BETTER_AUTH_URL=http://localhost:3000`, `EXPO_APP_SCHEMES=wattprint://`. README: describe the flow in five lines.
- [ ] **Step 4: Verify end to end** with `docker compose up --build -d`, then: `curl -s localhost:3000/api/auth/jwks` returns a `keys` array with `crv: Ed25519`; sign up via `curl -X POST localhost:3000/api/auth/sign-up/email -H "Content-Type: application/json" -H "Origin: wattprint://" -d '{"email":"t@example.com","password":"password123","name":"T"}' -i`, take the `set-auth-token` or cookie, `curl localhost:3000/api/auth/token` with it returns `{"token":"..."}`, and `curl -H "Authorization: Bearer <token>" localhost:8000/api/v1/me` returns the user. Paste the real output into the report. If `jwks` table creation needs the migration, check `docker compose logs auth`.
- [ ] **Step 5: Commit** in FAPI: `feat(auth): add Better Auth jwt plugin and compose wiring`.

### Task 3: App dependencies, env and auth client (APP)

**Files:**
- Modify: `package.json`, `src/env.ts`, `src/env.test.ts`, `.env.example`
- Create: `src/lib/auth-client.ts`

**Interfaces:**
- Produces: `env.EXPO_PUBLIC_AUTH_URL: string | undefined`; `authClient` (`createAuthClient` with `expoClient({ scheme: 'wattprint', storagePrefix: 'wattprint', storage: SecureStore })` and `jwtClient()`); `fetchApiToken(): Promise<string | null>` returning the JWT, `null` when the server answers 401, throwing `NetworkError` otherwise.

- [ ] **Step 1: Failing test** in `src/env.test.ts`: `EXPO_PUBLIC_AUTH_URL` accepts a URL, maps `''` to undefined, rejects `not-a-url`. Run `pnpm jest src/env.test.ts`; expected FAIL.
- [ ] **Step 2:** `npx expo install better-auth@<version from Task 2> @better-auth/expo@<same>` (if `expo install` rejects the exact spec, use `pnpm add` and say why). Add `EXPO_PUBLIC_AUTH_URL` to `envSchema` like `EXPO_PUBLIC_API_URL` (static access line included) and to `.env.example` (`http://localhost:3000`; API URL example `http://localhost:8000/api/v1`).
- [ ] **Step 3:** Implement `src/lib/auth-client.ts` as specified; `baseURL` from `env.EXPO_PUBLIC_AUTH_URL` (throw a clear error at import time if missing outside tests is NOT wanted: fall back to `http://localhost:3000`). `fetchApiToken` wraps `authClient.token()`: `data?.token` → return; `error?.status === 401` → `null`; anything else → `NetworkError` from `@/lib/errors`.
- [ ] **Step 4:** Unit-test `fetchApiToken` with `jest.mock` of the client module internals (three cases: token, 401, 500/offline). Run `pnpm jest src/lib src/env.test.ts`. Expected PASS. Check the installed `@better-auth/expo` typings in `node_modules` for `expoClient`/`jwtClient` option names before use (CLAUDE.md rule: docs vs installed version, SDK 58).
- [ ] **Step 5: Commit** `feat(auth): add Better Auth client and env`.

### Task 4: Token provider and API client (APP)

**Files:**
- Create: `src/lib/auth-token.ts`, `src/lib/auth-token.test.ts`, `src/lib/session.ts`, `src/lib/session.test.ts`

**Interfaces:**
- Consumes: `fetchApiToken`, `authClient`, `createApiClient`, `queryClient`.
- Produces: `createTokenProvider(opts: { fetchToken: () => Promise<string | null>; now?: () => number; marginMs?: number }): { getToken(): Promise<string | null>; refresh(): Promise<string | null>; clear(): void }` (marginMs default 30_000; expiry read from the JWT payload `exp`, base64url-decoded, never verified); in `session.ts`: `apiClient` (`createApiClient` with `baseUrl: env.EXPO_PUBLIC_API_URL`, `getAccessToken: tokens.getToken`, `refreshAccessToken: () => tokens.refresh().catch(() => null)`, `onSessionExpired: handleSessionExpired`), `signOutAndClear(): Promise<void>`, `handleSessionExpired(): Promise<void>`.

- [ ] **Step 1: Failing tests** for `createTokenProvider` (fake clock): `getToken` fetches once and reuses until `exp - margin`; refetches after; concurrent `getToken` calls share one fetch; `refresh` always fetches and replaces the cache; `fetchToken` returning `null` leaves the cache empty and `getToken` returns `null`; a thrown error propagates from `getToken` and does not poison the cache; `clear()` forces a new fetch. Tests for `session.ts` (mock `authClient`): `signOutAndClear` calls `authClient.signOut`, clears the token cache and `queryClient.clear()` even if `signOut` rejects; `handleSessionExpired` re-reads the session with `authClient.getSession({ query: { disableCookieCache: true } })` and calls `signOutAndClear` only when it returns no session and no error, and does nothing when the call fails with a network error (spec call 1).
- [ ] **Step 2:** Run `pnpm jest src/lib/auth-token.test.ts src/lib/session.test.ts`; expected FAIL.
- [ ] **Step 3:** Implement both files to the signatures above (single-flight via a shared pending promise like `refreshOnce` in `src/lib/http.ts`; token decode with `atob` after base64url→base64 conversion).
- [ ] **Step 4:** Run the two test files; expected PASS. Run `pnpm lint` on the files (zero warnings).
- [ ] **Step 5: Commit** `feat(auth): token provider and session helpers`.

### Task 5: Auth feature schemas and hooks (APP)

**Files:**
- Create: `src/features/auth/schemas.ts`, `src/features/auth/schemas.test.ts`, `src/features/auth/hooks/use-sign-in.ts`, `use-sign-up.ts`, `use-sign-out.ts`, with colocated tests.

**Interfaces:**
- Produces: `signInSchema` (`email` valid email, `password` min 8), `signUpSchema` (adds `name` min 1, max 64); types `SignInInput`, `SignUpInput`; hooks `useSignIn()`, `useSignUp()` returning TanStack `useMutation` results whose `mutationFn` calls `authClient.signIn.email` / `authClient.signUp.email` and throws `ApiError`-style errors via `errorMessage` mapping (a Better Auth `error` object becomes `ApiError(error.status, error.message, error)`); `useSignOut()` returning a mutation that calls `signOutAndClear`. Features may import `@/lib/*` but no other feature (`src/features/auth` imports no `@/app` or `@/screens`).

- [ ] **Step 1: Failing tests:** schema accepts valid input, rejects short password, bad email, empty name; `useSignIn` resolves on `{data}` and rejects with an `ApiError` carrying status 401 for `{error:{status:401,message:'Invalid email or password'}}`; `useSignUp` surfaces a 422/`USER_ALREADY_EXISTS` error as `ApiError`; `useSignOut` calls `signOutAndClear` once. Use `renderHook` with a `QueryClientProvider` wrapper like existing hook tests.
- [ ] **Step 2:** Run `pnpm jest src/features/auth`; expected FAIL.
- [ ] **Step 3:** Implement to the signatures above (mutations `retry: 0` already default).
- [ ] **Step 4:** Run the tests; expected PASS. `pnpm lint` for the folder.
- [ ] **Step 5: Commit** `feat(auth): sign-in, sign-up and sign-out hooks`.

### Task 6: Screens, routes and gating (APP)

**Files:**
- Create: `src/screens/auth/sign-in.tsx`, `src/screens/auth/sign-up.tsx` (+ tests), `src/app/(auth)/_layout.tsx`, `src/app/(auth)/sign-in.tsx`, `src/app/(auth)/sign-up.tsx`, `src/app/(app)/_layout.tsx`
- Modify: `src/app/_layout.tsx`, `src/screens/settings/index.tsx` (+ its test), `src/i18n/locales/en.json`, `src/i18n/locales/vi.json`
- Move: `src/app/(home)`, `(devices)`, `(energy)`, `(settings)` into `src/app/(app)/` with `git mv` (URLs are unchanged because groups are not part of the path).

**Interfaces:**
- Consumes: `authClient.useSession()` → `{ data, isPending }`, hooks from Task 5, `Input`, `Button`, `Text`, `Heading` from `@/components/ui`.
- Produces: root layout renders `Stack` with `<Stack.Protected guard={!!session}>` around `(app)` and `<Stack.Protected guard={!session}>` around `(auth)`, `headerShown: false`; `(app)/_layout.tsx` holds the existing `NativeTabs` unchanged; screens `SignInScreen`, `SignUpScreen` (default exports from `src/screens/auth/*`). Keep providers, `ErrorBoundary` and the theme code in the root layout.

- [ ] **Step 1: Failing tests** (React Native Testing Library, existing screen test style): sign-in screen renders email and password inputs and a submit button; invalid input shows the schema message and does not call the mutation; valid input calls `signIn.email` once even if pressed twice quickly (button disabled while pending); an error shows `errorMessage(...)` text with `selectable`; a link navigates to sign-up (and back). Settings screen shows a sign-out row that calls `useSignOut().mutate`.
- [ ] **Step 2:** Run `pnpm jest src/screens/auth src/screens/settings`; expected FAIL.
- [ ] **Step 3:** Implement screens with Uniwind semantic tokens and i18n keys `auth.signIn.*`, `auth.signUp.*`, `settings.signOut` in both locale files (same keys, Vietnamese strings real, not copies). Do the `git mv` and layout split. Hold the splash: call `SplashScreen.preventAutoHideAsync()` at module scope and `SplashScreen.hideAsync()` in an effect when `isPending` is false (add `expo-splash-screen` with `npx expo install` only if `package.json` lacks it). Verify with the installed expo-router typings that `Stack.Protected` takes `guard`.
- [ ] **Step 4:** Run `pnpm check` and `pnpm format:check`. Expected: all green (including `scripts/*-guard.test.ts` and `docs-links.test.ts`).
- [ ] **Step 5: Commit** `feat(auth): sign-in and sign-up screens with protected routes`.

### Task 7: Wire the API client, docs and device verification (APP)

**Files:**
- Modify: `docs/client-state.md`, `docs/data-fetching.md`, `docs/architecture.md`, `README.md`, `AGENTS.md` (Device verification: `adb -s 3C081JEKB17021 reverse tcp:3000 tcp:3000` and `tcp:8000`), `.claude/skills/wattprint-base/SKILL.md`
- Create: `docs/superpowers/reports/2026-10-30-better-auth-integration.md`
- Modify: `docs/superpowers/backlog/2026-10-25-auth-session-store.md` (mark done, link the report)

- [ ] **Step 1:** Update the docs in one commit with the rule changes (token in memory, refresh via `authClient.token()`, session in SecureStore via `expoClient`, sign-out cleanup, where `apiClient` lives); keep doc conventions from AGENTS.md (labels `(verified: ...)`). Run `pnpm check` (the docs-link test must pass).
- [ ] **Step 2: Device check.** Start the FAPI stack (`docker compose up -d`), set `EXPO_PUBLIC_AUTH_URL=http://localhost:3000` and `EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1`, run the adb reverse commands for 8081, 3000, 8000, then `pnpm android` (or `npx expo start --dev-client` for JS-only). Verify and screenshot: sign-up → tabs; force-stop and relaunch → still signed in; relaunch in airplane mode → still on tabs; a wrong password message; Settings sign-out → sign-in screen, and signing in as another user shows no previous data; call `/me` through `apiClient` once (temporary debug call, removed before commit) and confirm 200 in `docker compose logs api`; `adb -s 3C081JEKB17021 logcat -d ReactNativeJS:V *:S` has no `E` lines. Record any cleartext/`localhost` failure for the spec's open risks. Stop Metro afterwards.
- [ ] **Step 3:** Write the report (what ran, real outputs, what was not verified, docs changed). Run `npx expo-doctor`, `pnpm check`, `pnpm format:check`; paste results.
- [ ] **Step 4: Commit** `docs(auth): record Better Auth integration`.

---

## Self-review

- Spec coverage: auth service jwt() (T2), FastAPI JWKS (T1), expoClient + env (T3), in-memory token + refresh/expiry semantics (T4), sign-in/up/out (T5), gating + splash + settings row (T6), docs/verification (T7), calls 1-7 (T4 handler, T1 `/me` only, T2 step 1, T2 step 4, issuer env, T4 sign-out). Non-goals untouched.
- Types: `fetchApiToken`, `createTokenProvider`, `signOutAndClear`, `handleSessionExpired`, `apiClient` names are the same across tasks 3-7.
- Known unknowns left to execution (flagged in the steps): exact installed `expoClient`/`jwtClient`/`Stack.Protected` API on SDK 58, and cleartext localhost on the dev build.
