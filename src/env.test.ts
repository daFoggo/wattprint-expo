import fs from 'node:fs';
import path from 'node:path';

import { envSchema, parseEnv } from '@/env';

describe('env', () => {
  it('applies defaults', () => {
    // The public API and realm: the backend's Keycloak issues tokens for the public issuer only.
    expect(parseEnv({})).toEqual({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_API_URL: 'https://api.wattprint.ptitai.org/api/v1',
      EXPO_PUBLIC_KEYCLOAK_URL: 'https://auth.wattprint.ptitai.org/realms/wattprint',
    });
  });

  it('rejects an unknown app env', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_APP_ENV: 'staging' })).toThrow(/EXPO_PUBLIC_APP_ENV/);
  });

  it('rejects an invalid url', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: 'not a url' })).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('treats an empty url as unset', () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: '' }).EXPO_PUBLIC_API_URL).toBe(
      'https://api.wattprint.ptitai.org/api/v1',
    );
  });

  it('reads every key by static dot access', () => {
    const src = fs.readFileSync(path.join(__dirname, 'env.ts'), 'utf8');
    for (const k of Object.keys(envSchema.shape)) expect(src).toContain(`process.env.${k}`);
    expect(src).not.toMatch(/process\.env\[/);
    expect(src).not.toMatch(/\}\s*=\s*process\.env\b/);
  });
});
