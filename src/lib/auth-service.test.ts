import { ApiError, NetworkError } from '@/lib/errors';

import { createAuthService, type AuthStorage } from './auth-service';

const KEY = 'wattprint.refresh-token';
const BASE = 'http://api.test/api/v1';
const user = { id: 'u1', email: 'a@example.com', full_name: 'An', is_active: true };

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

// A fake fetch routed by "METHOD /path"; an unknown route fails the test.
function fakeFetch(routes: Record<string, Route>) {
  const calls: { route: string; init: RequestInit }[] = [];
  const fn = jest.fn((input: string, init: RequestInit) => {
    const route = `${init.method ?? 'GET'} ${input.replace(BASE, '')}`;
    calls.push({ route, init });
    const handler = routes[route];
    if (!handler) throw new Error(`unexpected request ${route}`);
    return handler(init);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const tokens = (access: string, refresh: string) =>
  reply(200, { access_token: access, refresh_token: refresh, token_type: 'bearer' });

describe('signIn', () => {
  it('posts the form, persists the refresh token and returns the access token and the user', async () => {
    const { storage, data } = memoryStorage();
    const { fn, calls } = fakeFetch({
      'POST /auth/token': () => tokens('access-1', 'refresh-1'),
      'GET /users/me': () => reply(200, user),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    const result = await service.signIn({ email: 'a+b@example.com', password: 'p w&1' });

    expect(result).toEqual({ accessToken: 'access-1', user });
    expect(data.get(KEY)).toBe('refresh-1');
    const [form, me] = calls;
    expect(form.init.body).toBe('username=a%2Bb%40example.com&password=p%20w%261');
    expect((form.init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    expect((me.init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
  });

  it('rejects a wrong password with a 401 ApiError and stores nothing', async () => {
    const { storage, data } = memoryStorage();
    const { fn } = fakeFetch({
      'POST /auth/token': () => reply(401, { detail: 'Incorrect email or password' }),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    const error = await service
      .signIn({ email: 'a@example.com', password: 'wrong-password' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: 'Incorrect email or password' });
    expect(data.size).toBe(0);
  });

  it('throws NetworkError when the service cannot be reached', async () => {
    const { storage } = memoryStorage();
    const { fn } = fakeFetch({
      'POST /auth/token': () => Promise.reject(new TypeError('Network request failed')),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(
      service.signIn({ email: 'a@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('hands the new token back and keeps nothing when loading the user fails', async () => {
    const { storage, data } = memoryStorage();
    const { fn, calls } = fakeFetch({
      'POST /auth/token': () => tokens('access-1', 'refresh-1'),
      'GET /users/me': () => reply(500, { detail: 'boom' }),
      'POST /auth/logout': () => reply(204),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(
      service.signIn({ email: 'a@example.com', password: 'password123' }),
    ).rejects.toThrow(/Could not load the signed-in user/);

    expect(data.size).toBe(0);
    const logout = calls.find((c) => c.route === 'POST /auth/logout');
    expect(JSON.parse(logout?.init.body as string)).toEqual({ refresh_token: 'refresh-1' });
  });

  it('does not report a /users/me 401 as wrong credentials', async () => {
    const { storage, data } = memoryStorage();
    const { fn } = fakeFetch({
      'POST /auth/token': () => tokens('access-1', 'refresh-1'),
      'GET /users/me': () => reply(401, { detail: 'Invalid or expired token' }),
      'POST /auth/logout': () => Promise.reject(new TypeError('offline')),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    const error = await service
      .signIn({ email: 'a@example.com', password: 'password123' })
      .catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ApiError);
    expect(data.size).toBe(0);
  });
});

describe('signUp', () => {
  it('registers with full_name, then signs in', async () => {
    const { storage, data } = memoryStorage();
    const { fn, calls } = fakeFetch({
      'POST /auth/register': () => reply(201, user),
      'POST /auth/token': () => tokens('access-1', 'refresh-1'),
      'GET /users/me': () => reply(200, user),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    const result = await service.signUp({
      email: 'a@example.com',
      password: 'password123',
      name: 'An',
    });

    expect(result.user).toEqual(user);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      email: 'a@example.com',
      password: 'password123',
      full_name: 'An',
    });
    expect(data.get(KEY)).toBe('refresh-1');
  });

  it('surfaces an already registered email as a 409 ApiError and does not sign in', async () => {
    const { storage } = memoryStorage();
    const { fn, calls } = fakeFetch({
      'POST /auth/register': () => reply(409, { detail: 'Email already registered' }),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(
      service.signUp({ email: 'a@example.com', password: 'password123' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Email already registered',
    });
    expect(calls).toHaveLength(1);
  });

  it('reads a 422 validation list into the message', async () => {
    const { storage } = memoryStorage();
    const { fn } = fakeFetch({
      'POST /auth/register': () =>
        reply(422, { detail: [{ loc: ['body', 'email'], msg: 'bad email', type: 'x' }] }),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.signUp({ email: 'x', password: 'password123' })).rejects.toMatchObject({
      status: 422,
      message: 'bad email',
    });
  });
});

describe('refreshAccessToken', () => {
  it('returns null without a request when nothing is stored', async () => {
    const { storage } = memoryStorage();
    const { fn } = fakeFetch({});
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.refreshAccessToken()).resolves.toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('rotates: sends the stored token and persists the new refresh token', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn, calls } = fakeFetch({
      'POST /auth/refresh': () => tokens('access-2', 'refresh-2'),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.refreshAccessToken()).resolves.toBe('access-2');

    expect(JSON.parse(calls[0].init.body as string)).toEqual({ refresh_token: 'refresh-1' });
    expect(data.get(KEY)).toBe('refresh-2');
  });

  it('removes the stored token and returns null on 401', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn } = fakeFetch({
      'POST /auth/refresh': () => reply(401, { detail: 'Invalid refresh token' }),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.refreshAccessToken()).resolves.toBeNull();
    expect(data.has(KEY)).toBe(false);
  });

  it('keeps the stored token and throws NetworkError when the network fails', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn } = fakeFetch({
      'POST /auth/refresh': () => Promise.reject(new TypeError('offline')),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.refreshAccessToken()).rejects.toBeInstanceOf(NetworkError);
    expect(data.get(KEY)).toBe('refresh-1');
  });

  it('keeps the stored token and throws NetworkError on a 5xx', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn } = fakeFetch({ 'POST /auth/refresh': () => reply(503, { detail: 'down' }) });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.refreshAccessToken()).rejects.toBeInstanceOf(NetworkError);
    expect(data.get(KEY)).toBe('refresh-1');
  });

  it('shares one /auth/refresh request between concurrent callers', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn, calls } = fakeFetch({
      'POST /auth/refresh': () => tokens('access-2', 'refresh-2'),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    const results = await Promise.all([
      service.refreshAccessToken(),
      service.refreshAccessToken(),
      service.refreshAccessToken(),
    ]);

    expect(results).toEqual(['access-2', 'access-2', 'access-2']);
    expect(calls.filter((c) => c.route === 'POST /auth/refresh')).toHaveLength(1);
    expect(data.get(KEY)).toBe('refresh-2');
  });

  it('allows a new refresh after the previous one settled', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    let n = 1;
    const { fn, calls } = fakeFetch({
      'POST /auth/refresh': () => {
        n += 1;
        return tokens(`access-${n}`, `refresh-${n}`);
      },
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await service.refreshAccessToken();
    await expect(service.refreshAccessToken()).resolves.toBe('access-3');

    expect(JSON.parse(calls[1].init.body as string)).toEqual({ refresh_token: 'refresh-2' });
    expect(data.get(KEY)).toBe('refresh-3');
  });
});

describe('signOut', () => {
  it('posts the refresh token to /auth/logout and removes it', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn, calls } = fakeFetch({ 'POST /auth/logout': () => reply(204) });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await service.signOut();

    expect(JSON.parse(calls[0].init.body as string)).toEqual({ refresh_token: 'refresh-1' });
    expect(data.has(KEY)).toBe(false);
  });

  it('removes the token even when /auth/logout fails', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn } = fakeFetch({
      'POST /auth/logout': () => Promise.reject(new TypeError('offline')),
    });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.signOut()).resolves.toBeUndefined();
    expect(data.has(KEY)).toBe(false);
  });

  it('removes the token when /auth/logout answers 500', async () => {
    const { storage, data } = memoryStorage({ [KEY]: 'refresh-1' });
    const { fn } = fakeFetch({ 'POST /auth/logout': () => reply(500, { detail: 'boom' }) });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await service.signOut();
    expect(data.has(KEY)).toBe(false);
  });

  it('makes no request when nothing is stored', async () => {
    const { storage } = memoryStorage();
    const { fn } = fakeFetch({});
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await service.signOut();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('hasStoredSession', () => {
  it('reflects whether a refresh token is stored', async () => {
    const { storage } = memoryStorage();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fakeFetch({}).fn });
    expect(await service.hasStoredSession()).toBe(false);
    await storage.set(KEY, 'refresh-1');
    expect(await service.hasStoredSession()).toBe(true);
  });
});

// A server with the real replay rules: a refresh token works once; presenting a spent or revoked one
// fails with 401 and revokes the whole family (every token issued from the same sign-in).
function replayServer() {
  let counter = 0;
  let families = 0;
  const issued = new Map<string, { family: number; used: boolean }>();
  const revoked = new Set<number>();
  const log: string[] = [];
  let gate: Promise<void> | null = null;

  const issue = (family: number) => {
    counter += 1;
    const token = `r${counter}`;
    issued.set(token, { family, used: false });
    return token;
  };
  const pair = (refresh: string) => tokens(`access-for-${refresh}`, refresh);
  const bodyOf = (init: RequestInit) =>
    JSON.parse(init.body as string) as { refresh_token: string };

  const routes: Record<string, Route> = {
    'POST /auth/token': () => {
      families += 1;
      return pair(issue(families));
    },
    'GET /users/me': () => reply(200, user),
    'POST /auth/refresh': async (init) => {
      const presented = bodyOf(init).refresh_token;
      log.push(`refresh:${presented}`);
      const info = issued.get(presented);
      let answer: Promise<unknown>;
      if (!info || revoked.has(info.family)) {
        answer = reply(401, { detail: 'Invalid refresh token' });
      } else if (info.used) {
        revoked.add(info.family);
        answer = reply(401, { detail: 'Refresh token reuse detected' });
      } else {
        info.used = true;
        answer = pair(issue(info.family));
      }
      if (gate) await gate;
      return answer;
    },
    'POST /auth/logout': (init) => {
      const presented = bodyOf(init).refresh_token;
      log.push(`logout:${presented}`);
      const info = issued.get(presented);
      if (info) revoked.add(info.family);
      return reply(204);
    },
  };

  return {
    ...fakeFetch(routes),
    log,
    // Holds the answer of every /auth/refresh (after the server processed it) until released.
    hold: () => {
      let release!: () => void;
      gate = new Promise<void>((resolve) => (release = resolve));
      return () => {
        gate = null;
        release();
      };
    },
    live: () => [...issued].filter(([, i]) => !i.used && !revoked.has(i.family)).map(([t]) => t),
  };
}

describe('against a server that enforces single-use refresh tokens', () => {
  const credentials = { email: 'a@example.com', password: 'password123' };
  const tick = () => new Promise((resolve) => setImmediate(resolve));

  it('signs out with the newest token when a refresh is in flight', async () => {
    const { storage, data } = memoryStorage();
    const server = replayServer();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: server.fn });
    await service.signIn(credentials);

    const release = server.hold();
    const pending = service.refreshAccessToken();
    await tick();
    const signedOut = service.signOut();
    await tick();
    release();

    await expect(pending).resolves.toBe('access-for-r2');
    await signedOut;
    expect(server.log).toEqual(['refresh:r1', 'logout:r2']);
    expect(server.live()).toEqual([]);
    expect(data.has(KEY)).toBe(false);
  });

  it('gives a caller that joined a refresh across a sign-in a token for the new session', async () => {
    const { storage, data } = memoryStorage();
    const server = replayServer();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: server.fn });
    await service.signIn(credentials);

    const release = server.hold();
    const pending = service.refreshAccessToken();
    await tick();
    await service.signIn({ email: 'b@example.com', password: 'password123' });
    release();

    // The first answer belongs to the old session; the retry uses what is stored now (r3, user B).
    await expect(pending).resolves.toBe('access-for-r4');
    expect(data.get(KEY)).toBe('r4');
    expect(server.log).toContain('refresh:r3');
    expect(server.log).toContain('logout:r2');
  });

  it('never presents a spent token: sequential refreshes keep working', async () => {
    const { storage } = memoryStorage();
    const server = replayServer();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: server.fn });
    await service.signIn(credentials);

    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r2');
    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r3');
    expect(server.log).toEqual(['refresh:r1', 'refresh:r2']);
  });
});

describe('signOut with a failing store', () => {
  it('still logs out on the server, then surfaces the storage error', async () => {
    const { storage } = memoryStorage({ [KEY]: 'refresh-1' });
    (storage.remove as jest.Mock).mockRejectedValue(new Error('keystore locked'));
    const { fn, calls } = fakeFetch({ 'POST /auth/logout': () => reply(204) });
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: fn });

    await expect(service.signOut()).rejects.toThrow('keystore locked');
    expect(calls.map((c) => c.route)).toEqual(['POST /auth/logout']);
  });
});

describe('when storage fails after a successful rotation', () => {
  const credentials = { email: 'a@example.com', password: 'password123' };

  it('keeps the new token in memory and never replays the spent one', async () => {
    const { storage, data } = memoryStorage();
    const server = replayServer();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: server.fn });
    await service.signIn(credentials);

    (storage.set as jest.Mock).mockRejectedValueOnce(new Error('keystore locked'));
    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r2');
    expect(data.get(KEY)).toBe('r1');

    // The next refresh presents r2 (not the spent r1) and writes it back first.
    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r3');
    expect(server.log).toEqual(['refresh:r1', 'refresh:r2']);
    expect(data.get(KEY)).toBe('r3');
  });

  it('keeps the session alive for the app run when storage never works again', async () => {
    const { storage } = memoryStorage();
    const server = replayServer();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: server.fn });
    await service.signIn(credentials);

    (storage.set as jest.Mock).mockRejectedValue(new Error('keystore locked'));
    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r2');
    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r3');
    await expect(service.refreshAccessToken()).resolves.toBe('access-for-r4');
    expect(server.log).toEqual(['refresh:r1', 'refresh:r2', 'refresh:r3']);
    expect(await service.hasStoredSession()).toBe(true);
  });

  it('signs out with the unsaved token', async () => {
    const { storage } = memoryStorage();
    const server = replayServer();
    const service = createAuthService({ baseUrl: BASE, storage, fetchFn: server.fn });
    await service.signIn(credentials);

    (storage.set as jest.Mock).mockRejectedValue(new Error('keystore locked'));
    await service.refreshAccessToken();
    await service.signOut();

    expect(server.log).toEqual(['refresh:r1', 'logout:r2']);
    expect(server.live()).toEqual([]);
    expect(await service.hasStoredSession()).toBe(false);
  });
});
