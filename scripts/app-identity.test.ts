import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { identitySuffix, applicationId } = require('./app-identity');

const BASE = 'com.dafoggo.wattprint';

describe('app identity', () => {
  it.each([
    ['development', '.dev', `${BASE}.dev`],
    ['preview', '.preview', `${BASE}.preview`],
    ['production', '', BASE],
  ])('maps %s', (env, suffix, id) => {
    expect(identitySuffix(env)).toBe(suffix);
    expect(applicationId(BASE, env)).toBe(id);
  });

  it('throws on an invalid env', () => {
    expect(() => identitySuffix('staging')).toThrow(/EXPO_PUBLIC_APP_ENV/);
  });
});

describe('eas.json', () => {
  const root = path.resolve(__dirname, '..');
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  const nvmrc = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const profiles = ['development', 'preview', 'production'];

  it('has exactly the three build profiles', () => {
    expect(Object.keys(eas.build).sort()).toEqual([...profiles].sort());
  });

  it('uses a dev client on development only', () => {
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.preview.developmentClient).toBeUndefined();
    expect(eas.build.production.developmentClient).toBeUndefined();
  });

  it.each(profiles)('%s sets EXPO_PUBLIC_APP_ENV to its name and pins node/pnpm', (name) => {
    expect(eas.build[name].env.EXPO_PUBLIC_APP_ENV).toBe(name);
    expect(eas.build[name].node).toBe(nvmrc);
    expect(eas.build[name].pnpm).toBe(pkg.packageManager.replace('pnpm@', ''));
  });

  it('uses remote app version source', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
  });
});
