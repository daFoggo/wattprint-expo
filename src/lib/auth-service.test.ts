import { ContractError, NetworkError } from '@/lib/errors';

import { createAuthService, oidcEndpoints, type AuthStorage } from './auth-service';

const KEY = 'wattprint.refresh-token';
const ISSUER = 'http://kc.test/realms/wattprint';
const API = 'http://api.test/api/v1';
const TOKEN = `${ISSUER}/protocol/openid-connect/token`;
const LOGOUT = `${ISSUER}/protocol/openid-connect/logout`;
const user = {
  id: 'u1',
  email: 'a@example.com',
  full_name: 'An',
  is_active: true,
  roles: ['admin'],
};
const code = { code: 'c1', codeVerifier: 'v1', redirectUri: 'wattprint://auth' };

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: AuthStorage = {
    get: jest.fn((k: string) => Promise.resolve(data.get(k) ?? null)),
    set: jest.fn((k: string, v: string) => {
      data.set(k, v);
      return Promise.resolve();
    }),
    remove: jest.fn((k: string) => {
      data.delete(k);
      return Promise.resolve();
    }),
  };
  return { storage, data };
}

const reply = (status: number, body?: unknown) =>
  Promise.resolve({
    status,
    ok: status < 400,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  });

type Route = (init: RequestInit) => Promise<unknown>;

// A fake fetch routed by "METHOD url"; an unknown route fails the test.
function fakeFetch(routes: Record<string, Route>) {
  const calls: { route: string; init: RequestInit }[] = [];
  const fn = jest.fn((input: string, init: RequestInit) => {
    const route = `${init.method ?? 'GET'} ${input}`;
    calls.push({ route, init });
    const handler = routes[route];
    if (!handler) throw new Error(`unexpected request: ${route}`);
    return handler(init);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const bodyOf = (init: RequestInit) => new URLSearchParams(String(init.body));

function setup(
  routes: Record<string, Route>,
  opts: { stored?: Record<string, string>; prompt?: () => Promise<typeof code | null> } = {},
) {
  const { storage, data } = memoryStorage(opts.stored);
  const http = fakeFetch(routes);
  const service = createAuthService({
    apiUrl: API,
    issuer: ISSUER,
    clientId: 'wattprint-mobile',
    storage,
    prompt: opts.prompt ?? (() => Promise.resolve(code)),
    fetchFn: http.fn,
  });
  return { service, storage, data, ...http };
}

const tokens = { access_token: 'a1', refresh_token: 'r1' };

describe('oidcEndpoints', () => {
  it('uses the Keycloak realm paths', () => {
    expect(oidcEndpoints(ISSUER)).toEqual({
      authorizationEndpoint: `${ISSUER}/protocol/openid-connect/auth`,
      tokenEndpoint: TOKEN,
      endSessionEndpoint: LOGOUT,
    });
  });
});

describe('signIn', () => {
  it('exchanges the code (PKCE), stores the refresh token and loads the user', async () => {
    const { service, data, calls } = setup({
      [`POST ${TOKEN}`]: () => reply(200, tokens),
      [`GET ${API}/users/me`]: () => reply(200, user),
    });

    await expect(service.signIn()).resolves.toEqual({ accessToken: 'a1', user });

    const form = bodyOf(calls[0]!.init);
    expect(Object.fromEntries(form)).toEqual({
      grant_type: 'authorization_code',
      client_id: 'wattprint-mobile',
      code: 'c1',
      redirect_uri: 'wattprint://auth',
      code_verifier: 'v1',
    });
    expect((calls[1]!.init.headers as Record<string, string>).Authorization).toBe('Bearer a1');
    expect(data.get(KEY)).toBe('r1');
  });

  it('returns null and changes nothing when the user closes the browser', async () => {
    const { service, fn, data } = setup({}, { prompt: () => Promise.resolve(null) });
    await expect(service.signIn()).resolves.toBeNull();
    expect(fn).not.toHaveBeenCalled();
    expect(data.size).toBe(0);
  });

  it('throws an ApiError with the Keycloak description when the code is rejected', async () => {
    const { service, data } = setup({
      [`POST ${TOKEN}`]: () =>
        reply(400, { error: 'invalid_grant', error_description: 'Code not valid' }),
    });
    await expect(service.signIn()).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Code not valid',
    });
    expect(data.size).toBe(0);
  });

  it('rejects a token response without a refresh token', async () => {
    const { service } = setup({ [`POST ${TOKEN}`]: () => reply(200, { access_token: 'a1' }) });
    await expect(service.signIn()).rejects.toBeInstanceOf(ContractError);
  });

  it('gives the session back and stores nothing when the profile cannot be loaded', async () => {
    const { service, data, calls } = setup({
      [`POST ${TOKEN}`]: () => reply(200, tokens),
      [`GET ${API}/users/me`]: () => reply(403, { detail: 'Inactive user' }),
      [`POST ${LOGOUT}`]: () => reply(204),
    });
    await expect(service.signIn()).rejects.toThrow(
      /Could not load the signed-in user \(HTTP 403\)/,
    );
    expect(data.size).toBe(0);
    expect(bodyOf(calls.at(-1)!.init).get('refresh_token')).toBe('r1');
  });

  it('revokes a leftover token of a lost session and returns null if signed out meanwhile', async () => {
    let service!: ReturnType<typeof setup>['service'];
    const s = setup(
      {
        [`POST ${TOKEN}`]: () => reply(200, tokens),
        [`GET ${API}/users/me`]: async () => {
          await service.signOut();
          return reply(200, user);
        },
        [`POST ${LOGOUT}`]: () => reply(204),
      },
      { stored: { [KEY]: 'old' } },
    );
    service = s.service;
    await expect(service.signIn()).resolves.toBeNull();
    const revoked = s.calls
      .filter((c) => c.route === `POST ${LOGOUT}`)
      .map((c) => bodyOf(c.init).get('refresh_token'));
    expect(revoked).toEqual(expect.arrayContaining(['old', 'r1']));
    expect(s.data.has(KEY)).toBe(false);
  });

  it('gives the session back when the API is unreachable', async () => {
    const { service, data } = setup({
      [`POST ${TOKEN}`]: () => reply(200, tokens),
      [`GET ${API}/users/me`]: () => Promise.reject(new TypeError('offline')),
      [`POST ${LOGOUT}`]: () => reply(204),
    });
    await expect(service.signIn()).rejects.toBeInstanceOf(NetworkError);
    expect(data.size).toBe(0);
  });
});

describe('refreshAccessToken', () => {
  const refreshRoute = (r: Route) => ({ [`POST ${TOKEN}`]: r });

  it('is null without a stored token and makes no request', async () => {
    const { service, fn } = setup({});
    await expect(service.refreshAccessToken()).resolves.toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('returns a fresh access token and keeps the refresh token Keycloak reuses', async () => {
    const { service, data, calls } = setup(
      refreshRoute(() => reply(200, { access_token: 'a2', refresh_token: 'r1' })),
      { stored: { [KEY]: 'r1' } },
    );
    await expect(service.refreshAccessToken()).resolves.toBe('a2');
    expect(bodyOf(calls[0]!.init).get('grant_type')).toBe('refresh_token');
    expect(data.get(KEY)).toBe('r1');
  });

  it('stores a rotated refresh token', async () => {
    const { service, data } = setup(
      refreshRoute(() => reply(200, { access_token: 'a2', refresh_token: 'r2' })),
      { stored: { [KEY]: 'r1' } },
    );
    await service.refreshAccessToken();
    expect(data.get(KEY)).toBe('r2');
  });

  it('shares one request between concurrent callers', async () => {
    const { service, fn } = setup(
      refreshRoute(() => reply(200, { access_token: 'a2' })),
      {
        stored: { [KEY]: 'r1' },
      },
    );
    const [a, b] = await Promise.all([service.refreshAccessToken(), service.refreshAccessToken()]);
    expect([a, b]).toEqual(['a2', 'a2']);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is null and forgets the token when Keycloak says the session ended (invalid_grant)', async () => {
    const { service, data } = setup(
      refreshRoute(() => reply(400, { error: 'invalid_grant' })),
      {
        stored: { [KEY]: 'r1' },
      },
    );
    await expect(service.refreshAccessToken()).resolves.toBeNull();
    expect(data.has(KEY)).toBe(false);
  });

  it('keeps a rotated token in memory when storage refuses it, and writes it on the next call', async () => {
    let n = 0;
    const { service, data, storage, calls } = setup(
      refreshRoute(() => reply(200, { access_token: `a${++n}`, refresh_token: `r${n + 1}` })),
      { stored: { [KEY]: 'r1' } },
    );
    (storage.set as jest.Mock).mockRejectedValueOnce(new Error('keystore locked'));

    await expect(service.refreshAccessToken()).resolves.toBe('a1');
    expect(data.get(KEY)).toBe('r1'); // the spent token is still on disk
    expect(await service.hasStoredSession()).toBe(true);

    await service.refreshAccessToken();
    // The second refresh used the unsaved r2, not the spent r1, and its answer was stored.
    expect(bodyOf(calls[1]!.init).get('refresh_token')).toBe('r2');
    expect(data.get(KEY)).toBe('r3');
  });

  it('keeps the token on a 400 that is not invalid_grant (misconfiguration)', async () => {
    const { service, data } = setup(
      refreshRoute(() => reply(400, { error: 'invalid_client' })),
      {
        stored: { [KEY]: 'r1' },
      },
    );
    await expect(service.refreshAccessToken()).rejects.toBeInstanceOf(NetworkError);
    expect(data.get(KEY)).toBe('r1');
  });

  it('keeps the token and throws NetworkError on a 5xx or when offline', async () => {
    const down = setup(
      refreshRoute(() => reply(503)),
      { stored: { [KEY]: 'r1' } },
    );
    await expect(down.service.refreshAccessToken()).rejects.toBeInstanceOf(NetworkError);
    expect(down.data.get(KEY)).toBe('r1');

    const offline = setup(
      refreshRoute(() => Promise.reject(new TypeError('offline'))),
      {
        stored: { [KEY]: 'r1' },
      },
    );
    await expect(offline.service.refreshAccessToken()).rejects.toBeInstanceOf(NetworkError);
    expect(offline.data.get(KEY)).toBe('r1');
  });

  it('does not write a stale answer back when a sign-out happened meanwhile', async () => {
    let release!: (v: unknown) => void;
    const slow = new Promise((resolve) => (release = resolve));
    const { service, data } = setup(
      {
        [`POST ${TOKEN}`]: () => slow,
        [`POST ${LOGOUT}`]: () => reply(204),
      },
      { stored: { [KEY]: 'r1' } },
    );
    const pending = service.refreshAccessToken();
    await Promise.resolve();
    // signOut waits for the refresh in flight, so release it first.
    const out = service.signOut();
    release(await reply(200, { access_token: 'a2', refresh_token: 'r9' }));
    await out;
    await pending.catch(() => undefined);
    expect(data.has(KEY)).toBe(false);
  });
});

describe('signOut', () => {
  it('removes the token and ends the Keycloak session with it', async () => {
    const { service, data, calls } = setup(
      { [`POST ${LOGOUT}`]: () => reply(204) },
      { stored: { [KEY]: 'r1' } },
    );
    await service.signOut();
    expect(data.has(KEY)).toBe(false);
    const form = bodyOf(calls[0]!.init);
    expect(form.get('refresh_token')).toBe('r1');
    expect(form.get('client_id')).toBe('wattprint-mobile');
  });

  it('still signs out locally when Keycloak is unreachable', async () => {
    const { service, data } = setup(
      { [`POST ${LOGOUT}`]: () => Promise.reject(new TypeError('offline')) },
      { stored: { [KEY]: 'r1' } },
    );
    await expect(service.signOut()).resolves.toBeUndefined();
    expect(data.has(KEY)).toBe(false);
  });

  it('makes no request when nothing is stored, and reports a failed removal', async () => {
    const none = setup({});
    await none.service.signOut();
    expect(none.fn).not.toHaveBeenCalled();

    const { service, storage } = setup(
      { [`POST ${LOGOUT}`]: () => reply(204) },
      { stored: { [KEY]: 'r1' } },
    );
    (storage.remove as jest.Mock).mockRejectedValueOnce(new Error('keystore locked'));
    await expect(service.signOut()).rejects.toThrow('keystore locked');
  });
});

describe('hasStoredSession', () => {
  it('reflects the stored refresh token', async () => {
    expect(await setup({}).service.hasStoredSession()).toBe(false);
    expect(await setup({}, { stored: { [KEY]: 'r1' } }).service.hasStoredSession()).toBe(true);
  });
});
