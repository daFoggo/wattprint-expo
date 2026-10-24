import { z } from 'zod';

import { ApiError, ContractError, NetworkError } from './errors';
import { createApiClient } from './http';

type FakeResponse = { ok: boolean; status: number; text: () => Promise<string> };

const reply = (status: number, body?: unknown): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

const fetchMock = jest.fn<Promise<FakeResponse>, [string, RequestInit]>();
const itemSchema = z.object({ id: z.number(), name: z.string() });

// A fetch that never answers and rejects when its signal aborts, like the real one.
const hangUntilAborted = (_url: string, init: RequestInit) =>
  new Promise<FakeResponse>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

const authHeader = (call: number) =>
  (fetchMock.mock.calls[call][1].headers as Record<string, string>).Authorization;

describe('createApiClient.request', () => {
  const client = createApiClient({ baseUrl: 'https://api.test' });

  it('parses a successful response with the schema and drops unknown fields', async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 1, name: 'a', extra: true }));
    await expect(client.request('/items/1', { schema: itemSchema })).resolves.toEqual({
      id: 1,
      name: 'a',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/items/1');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('sends a JSON body with a content type', async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 1, name: 'a' }));
    await client.request('/items', { schema: itemSchema, method: 'POST', body: { name: 'a' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"a"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('classifies an error response as ApiError with the FastAPI detail', async () => {
    fetchMock.mockResolvedValue(reply(404, { detail: 'Item not found' }));
    const error = await client.request('/x', { schema: itemSchema }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      detail: 'Item not found',
      message: 'Item not found',
    });
  });

  it('keeps a 422 validation detail list', async () => {
    const detail = [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }];
    fetchMock.mockResolvedValue(reply(422, { detail }));
    const error = await client.request('/x', { schema: itemSchema }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422, detail, message: 'Field required' });
  });

  it('classifies a failed fetch as NetworkError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(client.request('/x', { schema: itemSchema })).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws ContractError when the body does not match the schema', async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 'nope' }));
    const error = await client.request('/x', { schema: itemSchema }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ContractError);
    expect((error as ContractError).issues.length).toBeGreaterThan(0);
  });

  it('throws ContractError when a 200 body is not JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('<html>') });
    await expect(client.request('/x', { schema: itemSchema })).rejects.toBeInstanceOf(
      ContractError,
    );
  });

  it('accepts an empty 204 with a void schema', async () => {
    fetchMock.mockResolvedValue(reply(204));
    await expect(
      client.request('/x', { schema: z.void(), method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('rejects with the abort error, not NetworkError, when the caller aborts', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const controller = new AbortController();
    const pending = client.request('/x', { schema: itemSchema, signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect((error as Error).name).toBe('AbortError');
  });

  it('rejects at once when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.request('/x', { schema: itemSchema, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns a timeout into a retryable NetworkError', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(hangUntilAborted);
    const timed = createApiClient({ baseUrl: 'https://api.test', timeoutMs: 1000 });
    const pending = timed.request('/x', { schema: itemSchema }).catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(1000);
    const error = await pending;
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as Error).message).toMatch(/timed out/i);
  });
});

describe('createApiClient 401 refresh', () => {
  const make = (overrides: Partial<Parameters<typeof createApiClient>[0]> = {}) => {
    let token = 'old';
    const refreshAccessToken = jest.fn(async () => {
      token = 'new';
      return token;
    });
    const onSessionExpired = jest.fn();
    const client = createApiClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => token,
      refreshAccessToken,
      onSessionExpired,
      ...overrides,
    });
    return { client, refreshAccessToken, onSessionExpired };
  };

  it('refreshes once on 401 and retries the request with the new token', async () => {
    const { client, refreshAccessToken, onSessionExpired } = make();
    fetchMock
      .mockResolvedValueOnce(reply(401, { detail: 'expired' }))
      .mockResolvedValueOnce(reply(200, { id: 1, name: 'a' }));
    await expect(client.request('/me', { schema: itemSchema })).resolves.toEqual({
      id: 1,
      name: 'a',
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authHeader(0)).toBe('Bearer old');
    expect(authHeader(1)).toBe('Bearer new');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('single-flights the refresh across concurrent 401s', async () => {
    let release: (token: string) => void = () => {};
    const refreshAccessToken = jest.fn(
      () => new Promise<string | null>((resolve) => (release = resolve)),
    );
    const { client } = make({ refreshAccessToken });
    fetchMock.mockImplementation(async (_url, init) =>
      (init.headers as Record<string, string>).Authorization === 'Bearer old'
        ? reply(401, { detail: 'expired' })
        : reply(200, { id: 1, name: 'a' }),
    );
    const all = Promise.all([
      client.request('/a', { schema: itemSchema }),
      client.request('/b', { schema: itemSchema }),
      client.request('/c', { schema: itemSchema }),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    release('fresh');
    await all;
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('starts a new refresh after the previous one settled', async () => {
    const { client, refreshAccessToken } = make();
    fetchMock
      .mockResolvedValueOnce(reply(401, {}))
      .mockResolvedValueOnce(reply(200, { id: 1, name: 'a' }))
      .mockResolvedValueOnce(reply(401, {}))
      .mockResolvedValueOnce(reply(200, { id: 1, name: 'a' }));
    await client.request('/a', { schema: itemSchema });
    await client.request('/b', { schema: itemSchema });
    expect(refreshAccessToken).toHaveBeenCalledTimes(2);
  });

  it('retries only once: a second 401 expires the session and throws ApiError', async () => {
    const { client, refreshAccessToken, onSessionExpired } = make();
    fetchMock.mockResolvedValue(reply(401, { detail: 'nope' }));
    await expect(client.request('/me', { schema: itemSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('expires the session when the refresh returns no token', async () => {
    const { client, onSessionExpired } = make({ refreshAccessToken: jest.fn(async () => null) });
    fetchMock.mockResolvedValue(reply(401, { detail: 'expired' }));
    await expect(client.request('/me', { schema: itemSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('expires the session when the refresh itself throws', async () => {
    const { client, onSessionExpired } = make({
      refreshAccessToken: jest.fn(async () => {
        throw new NetworkError('offline');
      }),
    });
    fetchMock.mockResolvedValue(reply(401, { detail: 'expired' }));
    await expect(client.request('/me', { schema: itemSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh without a refresh function', async () => {
    const onSessionExpired = jest.fn();
    const client = createApiClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => 'old',
      onSessionExpired,
    });
    fetchMock.mockResolvedValue(reply(401, { detail: 'x' }));
    await expect(client.request('/me', { schema: itemSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('auth:false sends no token and never refreshes or expires on 401', async () => {
    const { client, refreshAccessToken, onSessionExpired } = make();
    fetchMock.mockResolvedValue(reply(401, { detail: 'bad credentials' }));
    await expect(
      client.request('/login', { schema: itemSchema, method: 'POST', auth: false }),
    ).rejects.toMatchObject({ status: 401 });
    expect(authHeader(0)).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not refresh when the request was sent without a token', async () => {
    const { client, refreshAccessToken, onSessionExpired } = make({ getAccessToken: () => null });
    fetchMock.mockResolvedValue(reply(401, { detail: 'x' }));
    await expect(client.request('/me', { schema: itemSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('a 401 from a refresh made through the client settles without deadlock', async () => {
    let client!: ReturnType<typeof createApiClient>;
    const onSessionExpired = jest.fn();
    client = createApiClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => 'old',
      refreshAccessToken: () =>
        client
          .request('/refresh', { schema: z.object({ token: z.string() }), auth: false })
          .then((r) => r.token),
      onSessionExpired,
    });
    fetchMock.mockResolvedValue(reply(401, { detail: 'expired' }));
    await expect(client.request('/me', { schema: itemSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('a late 401 after another request refreshed reuses the new token without refreshing', async () => {
    const { client, refreshAccessToken } = make();
    let lateResolve: (r: FakeResponse) => void = () => {};
    let first = true;
    fetchMock.mockImplementation((_url, init) => {
      const header = (init.headers as Record<string, string>).Authorization;
      if (header === 'Bearer new') return Promise.resolve(reply(200, { id: 1, name: 'a' }));
      if (first) {
        first = false;
        return Promise.resolve(reply(401, {}));
      }
      return new Promise((resolve) => (lateResolve = resolve));
    });
    const a = client.request('/a', { schema: itemSchema });
    const b = client.request('/b', { schema: itemSchema });
    await a;
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    lateResolve(reply(401, {}));
    await expect(b).resolves.toEqual({ id: 1, name: 'a' });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('expires the session once for concurrent requests when the refresh fails', async () => {
    const { client, onSessionExpired } = make({ refreshAccessToken: jest.fn(async () => null) });
    fetchMock.mockResolvedValue(reply(401, {}));
    await Promise.allSettled([
      client.request('/a', { schema: itemSchema }),
      client.request('/b', { schema: itemSchema }),
      client.request('/c', { schema: itemSchema }),
    ]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps only well-formed validation details', async () => {
    fetchMock.mockResolvedValue(reply(422, { detail: [null, {}, { msg: 'ok' }] }));
    const e1 = await createApiClient({ baseUrl: 'https://api.test' })
      .request('/x', { schema: itemSchema })
      .catch((e: unknown) => e);
    expect(e1).toMatchObject({ detail: [{ msg: 'ok' }], message: 'ok' });
    fetchMock.mockResolvedValue(reply(422, { detail: [null] }));
    const e2 = await createApiClient({ baseUrl: 'https://api.test' })
      .request('/x', { schema: itemSchema })
      .catch((e: unknown) => e);
    expect(e2).toMatchObject({ status: 422, detail: undefined, message: 'HTTP 422' });
    fetchMock.mockResolvedValue(reply(422, { detail: [{}] }));
    const e3 = await createApiClient({ baseUrl: 'https://api.test' })
      .request('/x', { schema: itemSchema })
      .catch((e: unknown) => e);
    expect(e3).toMatchObject({ message: 'HTTP 422' });
  });
});
