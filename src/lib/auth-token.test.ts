import { createTokenProvider } from './auth-token';

function jwt(exp: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'EdDSA' })}.${b64({ exp })}.sig`;
}

function setup(opts: { marginMs?: number } = {}) {
  let nowMs = 1_000_000;
  const fetchToken = jest.fn<Promise<string | null>, []>();
  const provider = createTokenProvider({
    fetchToken,
    now: () => nowMs,
    marginMs: opts.marginMs ?? 30_000,
  });
  return {
    fetchToken,
    provider,
    advance: (ms: number) => {
      nowMs += ms;
    },
    // A token that expires `ms` after the fake clock's current time.
    expiringIn: (ms: number) => jwt(Math.floor((nowMs + ms) / 1000)),
  };
}

describe('createTokenProvider', () => {
  it('fetches once and reuses the token until it is within the margin of expiry', async () => {
    const { provider, fetchToken, advance, expiringIn } = setup();
    fetchToken.mockResolvedValue(expiringIn(15 * 60_000));

    const first = await provider.getToken();
    advance(10 * 60_000);
    const second = await provider.getToken();

    expect(second).toBe(first);
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it('fetches a new token once the cached one is within the margin of expiry', async () => {
    const { provider, fetchToken, advance, expiringIn } = setup();
    fetchToken
      .mockResolvedValueOnce(expiringIn(60_000))
      .mockResolvedValueOnce(expiringIn(15 * 60_000));

    await provider.getToken();
    advance(40_000); // 20 s left, margin is 30 s
    await provider.getToken();

    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it('shares one fetch between concurrent callers', async () => {
    const { provider, fetchToken, expiringIn } = setup();
    fetchToken.mockResolvedValue(expiringIn(15 * 60_000));

    const [a, b] = await Promise.all([provider.getToken(), provider.getToken()]);

    expect(a).toBe(b);
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it('refresh always fetches and replaces the cached token', async () => {
    const { provider, fetchToken, expiringIn } = setup();
    const old = expiringIn(15 * 60_000);
    const fresh = expiringIn(16 * 60_000);
    fetchToken.mockResolvedValueOnce(old).mockResolvedValueOnce(fresh);

    await provider.getToken();
    await expect(provider.refresh()).resolves.toBe(fresh);
    await expect(provider.getToken()).resolves.toBe(fresh);
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it('returns null and caches nothing when the server rejects the session', async () => {
    const { provider, fetchToken, expiringIn } = setup();
    fetchToken.mockResolvedValueOnce(null).mockResolvedValueOnce(expiringIn(15 * 60_000));

    await expect(provider.getToken()).resolves.toBeNull();
    await expect(provider.getToken()).resolves.toEqual(expect.any(String));
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it('propagates a fetch error without poisoning the cache', async () => {
    const { provider, fetchToken, expiringIn } = setup();
    fetchToken
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(expiringIn(15 * 60_000));

    await expect(provider.getToken()).rejects.toThrow('offline');
    await expect(provider.getToken()).resolves.toEqual(expect.any(String));
  });

  it('clear forces a new fetch', async () => {
    const { provider, fetchToken, expiringIn } = setup();
    fetchToken.mockResolvedValue(expiringIn(15 * 60_000));

    await provider.getToken();
    provider.clear();
    await provider.getToken();

    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it('does not cache a token whose fetch was in flight when clear was called', async () => {
    const { provider, fetchToken, expiringIn } = setup();
    let resolveFirst!: (token: string) => void;
    fetchToken.mockImplementationOnce(
      () => new Promise<string>((resolve) => (resolveFirst = resolve)),
    );
    const previousUser = provider.getToken();

    provider.clear(); // sign-out while the previous user's token request is still pending
    resolveFirst(expiringIn(15 * 60_000));
    await previousUser;

    fetchToken.mockResolvedValueOnce(expiringIn(15 * 60_000));
    await provider.getToken();
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it('treats a token without a readable expiry as already expired', async () => {
    const { provider, fetchToken } = setup();
    fetchToken.mockResolvedValue('not-a-jwt');

    await provider.getToken();
    await provider.getToken();

    expect(fetchToken).toHaveBeenCalledTimes(2);
  });
});
