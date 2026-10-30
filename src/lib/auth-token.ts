export type TokenProviderOptions = {
  // The JWT for the API, null when the server rejected the session. Throws on network failure.
  fetchToken: () => Promise<string | null>;
  now?: () => number;
  // A cached token this close to its expiry is replaced before use.
  marginMs?: number;
};

const DEFAULT_MARGIN_MS = 30_000;

// Reads `exp` (ms) from the JWT payload without verifying it; the server does the verifying.
// A token without a readable expiry counts as already expired, so it is never reused.
function expiryMs(token: string): number {
  try {
    const payload = token.split('.')[1] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims: unknown = JSON.parse(atob(base64));
    const exp = (claims as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// Keeps the API JWT in memory only. Never persist it: the session lives in SecureStore (expoClient).
export function createTokenProvider(options: TokenProviderOptions) {
  const { fetchToken } = options;
  const now = options.now ?? Date.now;
  const marginMs = options.marginMs ?? DEFAULT_MARGIN_MS;

  let cached: { token: string; expiresAt: number } | null = null;
  let pending: Promise<string | null> | null = null;
  // Bumped by clear(): a fetch that started before it must not repopulate the cache.
  let generation = 0;

  function load(): Promise<string | null> {
    if (pending) return pending;
    const startedIn = generation;
    const request = (async () => {
      const token = await fetchToken();
      if (token && startedIn === generation) {
        cached = { token, expiresAt: expiryMs(token) };
      }
      return token;
    })().finally(() => {
      if (pending === request) pending = null;
    });
    pending = request;
    return request;
  }

  return {
    async getToken(): Promise<string | null> {
      if (cached && cached.expiresAt - marginMs > now()) return cached.token;
      return load();
    },
    refresh(): Promise<string | null> {
      cached = null;
      return load();
    },
    clear(): void {
      generation += 1;
      cached = null;
      pending = null;
    },
  };
}
