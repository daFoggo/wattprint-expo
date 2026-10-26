import type { z } from 'zod';

import { ApiError, ContractError, NetworkError, type ApiErrorDetail } from './errors';

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  // Returns a new access token, or null when the session cannot be refreshed.
  // Must call the client with `auth: false` (a 401 there must not trigger another refresh).
  refreshAccessToken?: () => Promise<string | null>;
  onSessionExpired?: () => void;
  timeoutMs?: number;
  // Called once per HTTP attempt (a retry after a refresh is a second call), `status` 0 when no
  // response arrived. An exception from the hook is swallowed.
  // The hook sees the path including its query string: never put tokens or secrets in URLs.
  onRequest?: (info: RequestLog) => void;
};

export type RequestLog = { method: string; path: string; status: number; ms: number };

export type RequestOptions<S extends z.ZodType> = {
  schema: S;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  // Default true. false: no Authorization header, no refresh, no onSessionExpired (login, refresh).
  auth?: boolean;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function abortError(): Error {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  if (text === '') return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function errorDetail(body: unknown): ApiErrorDetail {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return undefined;
  const { detail } = body;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const items = detail.filter(
      (d): d is { msg: string } =>
        typeof d === 'object' && d !== null && typeof (d as { msg?: unknown }).msg === 'string',
    );
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, getAccessToken, refreshAccessToken, onSessionExpired, onRequest } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let refreshing: Promise<string | null> | null = null;

  // Concurrent 401s share one refresh; the slot is freed once it settles. A refresh that yields
  // no token expires the session, once per settled refresh.
  function refreshOnce(): Promise<string | null> {
    refreshing ??= (async () => {
      const token = refreshAccessToken ? await refreshAccessToken().catch(() => null) : null;
      if (!token) onSessionExpired?.();
      return token;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(
    path: string,
    opts: RequestOptions<z.ZodType>,
    token: string | null,
  ): Promise<{ status: number; ok: boolean; text: string }> {
    const { signal } = opts;
    if (signal?.aborted) throw abortError();

    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const method = opts.method ?? 'GET';
    const startedAt = Date.now();
    let status = 0;

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
      status = response.status;
      return { status, ok: response.ok, text: await response.text() };
    } catch (error) {
      if (timedOut) throw new NetworkError('Request timed out', { cause: error });
      if (signal?.aborted) throw error;
      throw new NetworkError('Network request failed', { cause: error });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      try {
        onRequest?.({ method, path, status, ms: Date.now() - startedAt });
      } catch {
        // Instrumentation must never break a request.
      }
    }
  }

  async function request<S extends z.ZodType>(
    path: string,
    opts: RequestOptions<S>,
  ): Promise<z.output<S>> {
    const auth = opts.auth !== false;
    const sentToken = auth ? ((await getAccessToken?.()) ?? null) : null;
    let result = await send(path, opts, sentToken);

    if (result.status === 401 && sentToken) {
      // Another request may already have refreshed while this one was in flight.
      const current = (await getAccessToken?.()) ?? null;
      const token = current && current !== sentToken ? current : await refreshOnce();
      if (token) {
        result = await send(path, opts, token);
        if (result.status === 401) onSessionExpired?.();
      }
    }

    const json = parseJson(result.text);
    if (!result.ok) {
      const body = json.ok ? json.value : result.text;
      throw new ApiError(result.status, errorDetail(body), body);
    }
    if (!json.ok) throw new ContractError('Response is not valid JSON', []);

    const parsed = opts.schema.safeParse(json.value);
    if (!parsed.success) {
      throw new ContractError(`Response does not match the schema (${path})`, parsed.error.issues);
    }
    return parsed.data;
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
