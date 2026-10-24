import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const makeConfig = require('../app.config').default;

const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8'));

describe('app.config.ts', () => {
  const original = process.env.EXPO_PUBLIC_APP_ENV;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = original;
  });

  it.each([
    ['development', 'com.dafoggo.wattprint.dev', 'Wattprint (development)'],
    ['preview', 'com.dafoggo.wattprint.preview', 'Wattprint (preview)'],
    ['production', 'com.dafoggo.wattprint', 'Wattprint'],
  ])('resolves identity for %s', (env, id, name) => {
    process.env.EXPO_PUBLIC_APP_ENV = env;
    const cfg = makeConfig({ config: appJson.expo });
    expect(cfg.android.package).toBe(id);
    expect(cfg.ios.bundleIdentifier).toBe(id);
    expect(cfg.name).toBe(name);
  });

  it('throws on an invalid env', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    expect(() => makeConfig({ config: appJson.expo })).toThrow(/Invalid EXPO_PUBLIC_APP_ENV/);
  });
});
