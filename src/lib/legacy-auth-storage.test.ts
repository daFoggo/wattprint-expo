import type { AuthStorage } from '@/lib/auth-service';

import { removeLegacyAuthKeys } from './legacy-auth-storage';

function memory(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial));
  const storage: AuthStorage = {
    get: (k) => Promise.resolve(data.get(k) ?? null),
    set: (k, v) => {
      data.set(k, v);
      return Promise.resolve();
    },
    remove: (k) => {
      data.delete(k);
      return Promise.resolve();
    },
  };
  return { storage, data };
}

describe('removeLegacyAuthKeys', () => {
  it('deletes the cookie and session keys and leaves the current refresh token', async () => {
    const { storage, data } = memory({
      wattprint_cookie: '{}',
      wattprint_session_data: '{}',
      'wattprint.refresh-token': 'r1',
    });
    await removeLegacyAuthKeys(storage);
    expect([...data.keys()]).toEqual(['wattprint.refresh-token']);
  });

  it('deletes the chunks of a split value, in both layouts', async () => {
    const { storage, data } = memory({
      wattprint_cookie: 'ba-chunks:2',
      'wattprint_cookie.0': 'a',
      'wattprint_cookie.1': 'b',
      wattprint_session_data: 'ba-chunks:2:1:3',
      'wattprint_session_data.1.0': 'a',
      'wattprint_session_data.1.1': 'b',
      'wattprint_session_data.0.2': 'c',
      other: 'keep',
    });
    await removeLegacyAuthKeys(storage);
    expect([...data.keys()]).toEqual(['other']);
  });

  it('is idempotent and does nothing when the keys are absent', async () => {
    const { storage, data } = memory({ 'wattprint.refresh-token': 'r1' });
    await removeLegacyAuthKeys(storage);
    await removeLegacyAuthKeys(storage);
    expect([...data.keys()]).toEqual(['wattprint.refresh-token']);
  });

  it('ignores storage errors', async () => {
    const storage: AuthStorage = {
      get: () => Promise.reject(new Error('keystore')),
      set: () => Promise.resolve(),
      remove: () => Promise.reject(new Error('keystore')),
    };
    await expect(removeLegacyAuthKeys(storage)).resolves.toBeUndefined();
  });
});
