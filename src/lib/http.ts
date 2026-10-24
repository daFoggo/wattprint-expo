import type { z } from 'zod';

import { ApiError, ContractError, NetworkError, type ApiErrorDetail } from './errors';

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  // Returns a new access token, or null when the session cannot be refreshed.
  refreshAccessToken?: () => Promise<string | null>;
  onSessionExpired?: () => void;
  timeoutMs?: number;
};

export type RequestOptions<S extends z.ZodType> = {
  schema: S;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
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
  if (typeof detail === 'string' || Array.isArray(detail)) return detail as ApiErrorDetail;
  return undefined;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, getAccessToken, refreshAccessToken, onSessionExpired } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let refreshing: Promise<string | null> | null = null;

  // Concurrent 401s share one refresh; the slot is freed once it settles.
  function refreshOnce(): Promise<string | null> {
    if (!refreshAccessToken) return Promise.resolve(null);
    refreshing ??= refreshAccessToken()
      .catch(() => null)
      .finally(() => {
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

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
      return { status: response.status, ok: response.ok, text: await response.text() };
    } catch (error) {
      if (timedOut) throw new NetworkError('Request timed out', { cause: error });
      if (signal?.aborted) throw error;
      throw new NetworkError('Network request failed', { cause: error });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  async function request<S extends z.ZodType>(
    path: string,
    opts: RequestOptions<S>,
  ): Promise<z.output<S>> {
    let result = await send(path, opts, (await getAccessToken?.()) ?? null);

    if (result.status === 401) {
      const token = await refreshOnce();
      if (token) result = await send(path, opts, token);
      if (result.status === 401) onSessionExpired?.();
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
