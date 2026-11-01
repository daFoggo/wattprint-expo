import { z } from 'zod';

import { ApiError, ContractError, NetworkError, type ApiErrorDetail } from './errors';

// Async key-value store for the refresh token (SecureStore in the app, a Map in tests).
export type AuthStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export type AuthServiceOptions = {
  // FastAPI base URL including the version prefix, e.g. http://localhost:8000/api/v1
  baseUrl: string;
  storage: AuthStorage;
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
});
export type AuthUser = z.infer<typeof userSchema>;

const tokenPairSchema = z.object({ access_token: z.string(), refresh_token: z.string() });

export type SignInInput = { email: string; password: string };
export type SignUpInput = SignInInput & { name?: string };
export type SignInResult = { accessToken: string; user: AuthUser };

const DEFAULT_STORAGE_KEY = 'wattprint.refresh-token';
const DEFAULT_TIMEOUT_MS = 15_000;
// A refresh that times out may already have rotated the token on the server, so give it more time.
const REFRESH_TIMEOUT_MS = 30_000;

type Reply = { status: number; ok: boolean; body: unknown };

function detailOf(body: unknown): ApiErrorDetail {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return undefined;
  const { detail } = body;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const items = detail.filter(
      (d): d is { msg: string } => typeof (d as { msg?: unknown } | null)?.msg === 'string',
    );
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

function parse<S extends z.ZodType>(schema: S, body: unknown, what: string): z.output<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ContractError(`Response does not match the schema (${what})`, parsed.error.issues);
  }
  return parsed.data;
}

// Auth against the FastAPI-native JWT backend. Pure on purpose (no React Native imports): storage and
// fetch are injected. The access token is returned to the caller and never stored here; only the
// single-use refresh token is persisted.
export function createAuthService(options: AuthServiceOptions) {
  const { baseUrl, storage } = options;
  const fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  const key = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let refreshing: Promise<string | null> | null = null;
  // Bumped by sign-in and sign-out: a refresh that started before must not write the old session back.
  let epoch = 0;
  // A rotated refresh token that could not be written to storage. The old one is spent on the server,
  // so this one is the only valid token: it is the source of truth until storage accepts it.
  let unsaved: string | null = null;

  async function persist(token: string): Promise<void> {
    unsaved = token;
    try {
      await storage.set(key, token);
      if (unsaved === token) unsaved = null;
    } catch {
      // Kept in memory and written again on the next call; the session works for this app run.
      // The previous token on disk is spent (or belongs to the last user): drop it, so a restart
      // lands signed out instead of replaying it, which the server answers by revoking everything.
      await storage.remove(key).catch(() => undefined);
    }
  }

  async function currentToken(): Promise<string | null> {
    if (unsaved !== null) {
      const token = unsaved;
      await persist(token);
      return token;
    }
    return storage.get(key);
  }

  async function call(path: string, init: RequestInit, limitMs = timeoutMs): Promise<Reply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limitMs);
    try {
      const response = await fetchFn(`${baseUrl}${path}`, { ...init, signal: controller.signal });
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

  function json(path: string, body: unknown, limitMs?: number): Promise<Reply> {
    return call(
      path,
      {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      limitMs,
    );
  }

  function failure(reply: Reply): ApiError {
    return new ApiError(reply.status, detailOf(reply.body), reply.body);
  }

  async function signIn(input: SignInInput): Promise<SignInResult> {
    const form = `username=${encodeURIComponent(input.email)}&password=${encodeURIComponent(input.password)}`;
    const reply = await call('/auth/token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!reply.ok) throw failure(reply);
    const tokens = parse(tokenPairSchema, reply.body, '/auth/token');

    epoch += 1;
    unsaved = null;
    await persist(tokens.refresh_token);

    // No half session: when the profile cannot be loaded, give the new token back to the server.
    const abandon = async () => {
      await json('/auth/logout', { refresh_token: tokens.refresh_token }).catch(() => undefined);
      unsaved = null;
      await storage.remove(key);
    };
    let me: Reply;
    try {
      me = await call('/users/me', {
        headers: { Accept: 'application/json', Authorization: `Bearer ${tokens.access_token}` },
      });
    } catch (error) {
      await abandon();
      throw error;
    }
    if (!me.ok) {
      await abandon();
      // Not an ApiError 401: that would read as "wrong password" although the password was accepted.
      throw new Error(`Could not load the signed-in user (HTTP ${me.status})`, {
        cause: failure(me),
      });
    }
    return { accessToken: tokens.access_token, user: parse(userSchema, me.body, '/users/me') };
  }

  async function signUp(input: SignUpInput): Promise<SignInResult> {
    const reply = await json('/auth/register', {
      email: input.email,
      password: input.password,
      ...(input.name ? { full_name: input.name } : {}),
    });
    if (!reply.ok) throw failure(reply);
    return signIn(input);
  }

  // STALE: a sign-in or sign-out happened while the request was in flight, so its answer belongs to
  // a session that is gone.
  const STALE = Symbol('stale');

  async function rotate(): Promise<string | null | typeof STALE> {
    const startedIn = epoch;
    const stored = await currentToken();
    if (!stored) return null;

    const reply = await json('/auth/refresh', { refresh_token: stored }, REFRESH_TIMEOUT_MS);

    if (startedIn !== epoch) {
      // Hand a rotated token we will not use back to the server instead of leaving it live.
      const spare = tokenPairSchema.safeParse(reply.body);
      if (reply.ok && spare.success) {
        await json('/auth/logout', { refresh_token: spare.data.refresh_token }).catch(
          () => undefined,
        );
      }
      return STALE;
    }
    if (reply.status === 401) {
      unsaved = null;
      await storage.remove(key);
      return null;
    }
    if (!reply.ok) {
      throw new NetworkError(`Auth service answered HTTP ${reply.status}`, { cause: reply.body });
    }
    const tokens = parse(tokenPairSchema, reply.body, '/auth/refresh');
    // The old token is spent now: persist the new one before anything else can fail or return.
    await persist(tokens.refresh_token);
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

  // null: no session (nothing stored, or the server rejected the refresh token, which is then removed).
  // NetworkError: could not tell (offline, timeout, 5xx); the stored token is kept.
  function refreshAccessToken(): Promise<string | null> {
    refreshing ??= rotateCurrent().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function signOut(): Promise<void> {
    // A refresh in flight rotates the token: wait for it, so the logout uses the newest one and the
    // spent token is never presented (a reused refresh token revokes the whole chain).
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
    if (stored) {
      try {
        await json('/auth/logout', { refresh_token: stored });
      } catch {
        // Best effort.
      }
    }
    // Never leave the token behind silently: both steps were attempted, now say that one failed.
    if (removeFailed) throw removeError;
  }

  async function hasStoredSession(): Promise<boolean> {
    return unsaved !== null || (await storage.get(key)) !== null;
  }

  return { signUp, signIn, refreshAccessToken, signOut, hasStoredSession };
}

export type AuthService = ReturnType<typeof createAuthService>;
