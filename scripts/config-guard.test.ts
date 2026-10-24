import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const appJson = readJson('app.json');
const pkg = readJson('package.json');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const globFiles = (name: string, ignore: string[]): string[] => {
  const ignored = ignore.map((g) => g.replace('/**', ''));
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (ignored.includes(rel) || rel === '.git' || rel === '.superpowers') continue;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === name.replace('**/', '')) found.push(rel);
    }
  };
  walk('');
  return found;
};

test('app.json has no web config and uses placeholder ids', () => {
  expect(appJson.expo.web).toBeUndefined();
  expect(appJson.expo.android.package).toBe('com.wattprint.app');
  expect(appJson.expo.ios.bundleIdentifier).toBe('com.wattprint.app');
});

test('no template scripts or web deps', () => {
  expect(pkg.scripts).not.toHaveProperty('reset-project');
  expect(pkg.scripts).not.toHaveProperty('web');
  // no exception recorded in step 1.9
  expect(pkg.dependencies).not.toHaveProperty('react-native-web');
  expect(pkg.devDependencies ?? {}).not.toHaveProperty('react-native-web');
});

test.each([
  'scripts/reset-project.js',
  'src/components/themed-text.tsx',
  'src/components/app-tabs.tsx',
  'src/app/explore.tsx',
  'assets/images/tabIcons',
  'assets/images/react-logo.png',
])('%s removed', (p) => expect(fs.existsSync(path.join(root, p))).toBe(false));

test('uniwind is the outermost metro wrapper', () =>
  expect(read('metro.config.js')).toMatch(/module\.exports\s*=\s*withUniwindConfig\(/));

test('single css entry', () =>
  expect(globFiles('**/global.css', ['node_modules/**', 'android/**', 'ios/**'])).toEqual([
    'src/global.css',
  ]));

test('babel has no nativewind', () => {
  if (fs.existsSync(path.join(root, 'babel.config.js'))) {
    expect(read('babel.config.js')).not.toMatch(/nativewind/);
  }
});

test.each([
  'tabs',
  'table',
  'bottomsheet',
  'calendar',
  'date-time-picker',
  'skeleton',
  'grid',
  'liquid-glass',
  'image-viewer',
])('no alpha component %s', (c) =>
  expect(fs.existsSync(path.join(root, `src/components/ui/${c}`))).toBe(false),
);
