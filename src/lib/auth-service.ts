import { z } from 'zod';

import { ApiError, ContractError, NetworkError, type ApiErrorDetail } from './errors';

// Async key-value store for the refresh token (SecureStore in the app, a Map in tests).
export type AuthStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

// What the browser step of the authorization-code + PKCE flow hands back.
export type AuthCode = { code: string; codeVerifier: string; redirectUri: string };

export type AuthServiceOptions = {
  // FastAPI base URL including the version prefix, e.g. http://localhost:8000/api/v1
  apiUrl: string;
  // Keycloak realm URL, e.g. http://localhost:8180/realms/wattprint (must equal the token `iss`).
  issuer: string;
  clientId: string;
  storage: AuthStorage;
  // Opens the Keycloak login in the system browser. null: the user closed it.
  prompt: () => Promise<AuthCode | null>;
  fetchFn?: typeof fetch;
  // Storage key of the refresh token. SecureStore accepts letters, digits, `.`, `-` and `_`.
  storageKey?: string;
  timeoutMs?: number;
};

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  is_active: z.boolean(),
  roles: z.array(z.string()),
});
export type AuthUser = z.infer<typeof userSchema>;

// Keycloak rotates the refresh token only when the realm turns that on, so it is optional on refresh.
const tokenSchema = z.object({ access_token: z.string(), refresh_token: z.string().optional() });

export type SignInResult = { accessToken: string; user: AuthUser };

const DEFAULT_STORAGE_KEY = 'wattprint.refresh-token';
const DEFAULT_TIMEOUT_MS = 15_000;

export function oidcEndpoints(issuer: string) {
  const base = `${issuer}/protocol/openid-connect`;
  return {
    authorizationEndpoint: `${base}/auth`,
    tokenEndpoint: `${base}/token`,
    endSessionEndpoint: `${base}/logout`,
  };
}

type Reply = { status: number; ok: boolean; body: unknown };

// FastAPI answers `{detail}`, Keycloak `{error, error_description}`.
function detailOf(body: unknown): ApiErrorDetail {
  if (typeof body !== 'object' || body === null) return undefined;
  const { detail, error_description: description } = body as Record<string, unknown>;
  if (typeof detail === 'string') return detail;
  if (typeof description === 'string') return description;
  return undefined;
}

function parse<S extends z.ZodType>(schema: S, body: unknown, what: string): z.output<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ContractError(`Response does not match the schema (${what})`, parsed.error.issues);
  }
  return parsed.data;
}

const formBody = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

// Sign-in through Keycloak (OIDC authorization code + PKCE, public client). Pure on purpose (no React
// Native imports): storage, fetch and the browser step are injected. The access token is returned to
// the caller and never stored here; only the refresh token is persisted.
export function createAuthService(options: AuthServiceOptions) {
  const { apiUrl, clientId, storage, prompt } = options;
  const fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  const key = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { tokenEndpoint, endSessionEndpoint } = oidcEndpoints(options.issuer);

  let refreshing: Promise<string | null> | null = null;
  // Bumped by sign-in and sign-out: a refresh that started before must not write the old session back.
  let epoch = 0;
  // A rotated refresh token that storage refused. Keycloak revokes the old one on use, so this is the only
  // valid token until a write succeeds: it wins over storage and is written again on the next call.
  let unsaved: string | null = null;

  async function save(token: string): Promise<void> {
    unsaved = token;
    try {
      await storage.set(key, token);
      if (unsaved === token) unsaved = null;
    } catch {
      // Kept in memory: the session survives this app run.
    }
  }

  const currentToken = async () => unsaved ?? (await storage.get(key));

  async function call(url: string, init: RequestInit): Promise<Reply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, { ...init, signal: controller.signal });
      const text = await response.text();
      let body: unknown = text;
      try {
        body = text === '' ? undefined : JSON.parse(text);
      } catch {
        // keep the raw text
      }
      return { status: response.status, ok: response.ok, body };
    } catch (cause) {
      throw new NetworkError('Could not reach the auth service', { cause });
    } finally {
      clearTimeout(timer);
    }
  }

  function form(url: string, fields: Record<string, string>): Promise<Reply> {
    return call(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody(fields),
    });
  }

  const failure = (reply: Reply) => new ApiError(reply.status, detailOf(reply.body), reply.body);

  // Ends the Keycloak session of this refresh token. Best effort.
  const revoke = (refreshToken: string) =>
    form(endSessionEndpoint, { client_id: clientId, refresh_token: refreshToken }).catch(
      () => undefined,
    );

  // null: the user closed the browser, nothing changed.
  async function signIn(): Promise<SignInResult | null> {
    const auth = await prompt();
    if (!auth) return null;
    const reply = await form(tokenEndpoint, {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: auth.code,
      redirect_uri: auth.redirectUri,
      code_verifier: auth.codeVerifier,
    });
    if (!reply.ok) throw failure(reply);
    const tokens = parse(tokenSchema, reply.body, 'token');
    if (!tokens.refresh_token) {
      throw new ContractError('Token response has no refresh_token', []);
    }
    const refreshToken = tokens.refresh_token;

    // No half session: when the profile cannot be loaded, end the Keycloak session again.
    const abandon = async () => {
      await revoke(refreshToken);
      await storage.remove(key).catch(() => undefined);
    };
    // A refresh in flight may still rotate the old token: let it finish so `previous` is the live one.
    await refreshing?.catch(() => undefined);
    epoch += 1;
    unsaved = null;
    const mine = epoch;
    try {
      // A token left over from a session we lost track of must not stay alive at Keycloak.
      const previous = await storage.get(key).catch(() => null);
      if (previous && previous !== refreshToken) void revoke(previous);
      await storage.set(key, refreshToken);
      const me = await call(`${apiUrl}/users/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!me.ok) {
        // Not a plain ApiError: a 401 here would read as "wrong password" although Keycloak accepted it.
        throw new Error(`Could not load the signed-in user (HTTP ${me.status})`, {
          cause: failure(me),
        });
      }
      const user = parse(userSchema, me.body, '/users/me');
      // A sign-out during the profile call already ended this session: do not sign in again.
      return epoch === mine ? { accessToken: tokens.access_token, user } : null;
    } catch (error) {
      await abandon();
      throw error;
    }
  }

  // STALE: a sign-in or sign-out happened while the request was in flight, so its answer belongs to
  // a session that is gone.
  const STALE = Symbol('stale');

  async function rotate(): Promise<string | null | typeof STALE> {
    const startedIn = epoch;
    const stored = await currentToken();
    if (!stored) return null;

    const reply = await form(tokenEndpoint, {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: stored,
    });

    if (startedIn !== epoch) return STALE;
    // Keycloak answers 400 invalid_grant when the session ended or the token expired. Other 4xx
    // (invalid_client, a wrong realm URL) are deployment mistakes and must not sign everyone out.
    if (
      reply.status === 400 &&
      (reply.body as { error?: unknown } | undefined)?.error === 'invalid_grant'
    ) {
      unsaved = null;
      await storage.remove(key).catch(() => undefined);
      return null;
    }
    if (!reply.ok) {
      throw new NetworkError(`Auth service answered HTTP ${reply.status}`, { cause: reply.body });
    }
    const tokens = parse(tokenSchema, reply.body, 'token');
    if (tokens.refresh_token && tokens.refresh_token !== stored) {
      await save(tokens.refresh_token);
    }
    return tokens.access_token;
  }

  // One retry when the session changed under the request: callers that joined it (for example the
  // first request of a user who just signed in) get a token for the current session, not null.
  async function rotateCurrent(): Promise<string | null> {
    const first = await rotate();
    if (first !== STALE) return first;
    const second = await rotate();
    return second === STALE ? null : second;
  }

  // null: no session (nothing stored, or Keycloak rejected the refresh token, which is then removed).
  // NetworkError: could not tell (offline, timeout, 5xx); the stored token is kept.
  function refreshAccessToken(): Promise<string | null> {
    refreshing ??= rotateCurrent().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function signOut(): Promise<void> {
    await refreshing?.catch(() => undefined);
    epoch += 1;
    const stored = unsaved ?? (await storage.get(key).catch(() => null));
    unsaved = null;
    let removeError: unknown;
    let removeFailed = false;
    try {
      await storage.remove(key);
    } catch (error) {
      removeFailed = true;
      removeError = error;
    }
    if (stored) await revoke(stored);
    // Never leave the token behind silently: both steps were attempted, now say that one failed.
    if (removeFailed) throw removeError;
  }

  async function hasStoredSession(): Promise<boolean> {
    return unsaved !== null || (await storage.get(key)) !== null;
  }

  return { signIn, refreshAccessToken, signOut, hasStoredSession };
}

export type AuthService = ReturnType<typeof createAuthService>;
