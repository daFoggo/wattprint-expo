import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const appJson = readJson('app.json');
const pkg = readJson('package.json');

test('app.json has no web config and uses placeholder ids', () => {
  expect(appJson.expo.web).toBeUndefined();
  expect(appJson.expo.android.package).toBe('com.wattprint.app');
  expect(appJson.expo.ios.bundleIdentifier).toBe('com.wattprint.app');
});

test('no template scripts or web deps', () => {
  expect(pkg.scripts).not.toHaveProperty('reset-project');
  expect(pkg.scripts).not.toHaveProperty('web');
  expect(pkg.dependencies).not.toHaveProperty('react-native-web');
});

test.each([
  'scripts/reset-project.js',
  'src/components/themed-text.tsx',
  'src/components/app-tabs.tsx',
  'src/app/explore.tsx',
  'assets/images/tabIcons',
  'assets/images/react-logo.png',
])('%s removed', (p) => expect(fs.existsSync(path.join(root, p))).toBe(false));
