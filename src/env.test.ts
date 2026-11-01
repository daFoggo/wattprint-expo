import fs from 'node:fs';
import path from 'node:path';

import { envSchema, parseEnv } from '@/env';

describe('env', () => {
  it('applies defaults', () => {
    expect(parseEnv({})).toEqual({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_API_URL: undefined,
    });
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
