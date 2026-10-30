import fs from 'node:fs';
import path from 'node:path';

import { envSchema, parseEnv } from '@/env';

describe('env', () => {
  it('applies defaults', () => {
    expect(parseEnv({})).toEqual({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_API_URL: undefined,
      EXPO_PUBLIC_AUTH_URL: undefined,
    });
  });

  it('accepts an auth url and treats an empty one as undefined', () => {
    expect(parseEnv({ EXPO_PUBLIC_AUTH_URL: 'http://localhost:3000' }).EXPO_PUBLIC_AUTH_URL).toBe(
      'http://localhost:3000',
    );
    expect(parseEnv({ EXPO_PUBLIC_AUTH_URL: '' }).EXPO_PUBLIC_AUTH_URL).toBeUndefined();
  });

  it('rejects an invalid auth url', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_AUTH_URL: 'not-a-url' })).toThrow(/EXPO_PUBLIC_AUTH_URL/);
  });

  it('rejects an unknown app env', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_APP_ENV: 'staging' })).toThrow(/EXPO_PUBLIC_APP_ENV/);
  });

  it('rejects an invalid url', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: 'not a url' })).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('treats an empty url as undefined', () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: '' }).EXPO_PUBLIC_API_URL).toBeUndefined();
  });

  it('reads every key by static dot access', () => {
    const src = fs.readFileSync(path.join(__dirname, 'env.ts'), 'utf8');
    for (const k of Object.keys(envSchema.shape)) expect(src).toContain(`process.env.${k}`);
    expect(src).not.toMatch(/process\.env\[/);
    expect(src).not.toMatch(/\}\s*=\s*process\.env\b/);
  });
});
