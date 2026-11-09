import { redirectAuthReturn } from './auth-redirect';

describe('redirectAuthReturn', () => {
  it.each(['wattprint://auth?code=1&state=2', 'wattprint://auth', '/auth?code=1', 'auth'])(
    'sends the Keycloak return URL %s to the root',
    (path) => {
      expect(redirectAuthReturn(path)).toBe('/');
    },
  );

  it.each(['/', '/devices', 'wattprint://devices', '/authors'])('keeps %s', (path) => {
    expect(redirectAuthReturn(path)).toBe(path);
  });
});
