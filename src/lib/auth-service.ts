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

  async function call(path: string, init: RequestInit): Promise<Reply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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

  function json(path: string, body: unknown, headers?: Record<string, string>): Promise<Reply> {
    return call(path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
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
    await storage.set(key, tokens.refresh_token);

    const me = await call('/users/me', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${tokens.access_token}` },
    }).catch(async (error: unknown) => {
      await storage.remove(key);
      throw error;
    });
    if (!me.ok) {
      await storage.remove(key);
      throw failure(me);
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

  async function rotate(): Promise<string | null> {
    const startedIn = epoch;
    const stored = await storage.get(key);
    if (!stored) return null;

    const reply = await json('/auth/refresh', { refresh_token: stored });

    if (reply.status === 401) {
      // Only drop the token we sent: a sign-in during the request may have stored a newer one.
      if ((await storage.get(key)) === stored) await storage.remove(key);
      return null;
    }
    if (!reply.ok) {
      throw new NetworkError(`Auth service answered HTTP ${reply.status}`, { cause: reply.body });
    }
    const tokens = parse(tokenPairSchema, reply.body, '/auth/refresh');
    // The old token is spent now: persist the new one before anything else can fail or return.
    if (startedIn !== epoch) return null;
    await storage.set(key, tokens.refresh_token);
    return tokens.access_token;
  }

  // null: no session (nothing stored, or the server rejected the refresh token, which is then removed).
  // NetworkError: could not tell (offline, 5xx); the stored token is kept.
  function refreshAccessToken(): Promise<string | null> {
    refreshing ??= rotate().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function signOut(): Promise<void> {
    epoch += 1;
    const stored = await storage.get(key).catch(() => null);
    await storage.remove(key);
    if (!stored) return;
    try {
      await json('/auth/logout', { refresh_token: stored });
    } catch {
      // Best effort: the token is already gone locally.
    }
  }

  async function hasStoredSession(): Promise<boolean> {
    return (await storage.get(key)) !== null;
  }

  return { signUp, signIn, refreshAccessToken, signOut, hasStoredSession };
}

export type AuthService = ReturnType<typeof createAuthService>;
