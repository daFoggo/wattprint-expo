import { spawnSync } from 'child_process';
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
      if (
        ignored.includes(rel) ||
        rel === '.git' ||
        rel === '.superpowers' ||
        rel === '.claude/worktrees'
      )
        continue;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === name.replace('**/', '')) found.push(rel);
    }
  };
  walk('');
  return found;
};

test('app.json has no web config and uses the final base ids', () => {
  expect(appJson.expo.web).toBeUndefined();
  expect(appJson.expo.android.package).toBe('com.dafoggo.wattprint');
  expect(appJson.expo.ios.bundleIdentifier).toBe('com.dafoggo.wattprint');
});

test('no template scripts; web deps only as the recorded peer exception', () => {
  expect(pkg.scripts).not.toHaveProperty('reset-project');
  expect(pkg.scripts).not.toHaveProperty('web');
  // Recorded exception (step 1.9): react-native-web and react-dom are required peers of
  // @gluestack-ui/core, @gluestack-ui/utils and @tanstack/react-pacer (expo-doctor).
  // They must stay unused: see the import scan below.
  // The regex below only exempts these two recorded exceptions; any other *web* package fails.
  const allowed = ['react-native-web', 'react-dom'];
  const webLike = Object.keys({ ...pkg.dependencies, ...(pkg.devDependencies ?? {}) }).filter(
    (name) => /(^|[-/])web($|[-/])/.test(name) && !allowed.includes(name),
  );
  expect(webLike).toEqual([]);
});

test('no source file imports react-native-web or react-dom', () => {
  const offenders: string[] = [];
  const webImport =
    /(from\s+|import\s+|require\(\s*|import\(\s*)['"](react-native-web|react-dom)(\/[^'"]*)?['"]/;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        if (webImport.test(read(rel))) offenders.push(rel);
      }
    }
  };
  walk('src');
  expect(offenders).toEqual([]);
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

test.each(['nativewind', '@legendapp/motion'])('package.json has no %s', (name) => {
  const all = { ...pkg.dependencies, ...(pkg.devDependencies ?? {}) };
  expect(all).not.toHaveProperty(name);
});

test.each([
  'babel.config.js',
  'babel.config.cjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'globals.css',
  'nativewind-env.d.ts',
  'src/globals.css',
  'src/nativewind-env.d.ts',
])('%s must not exist (no NativeWind/Babel/Tailwind config files)', (p) =>
  expect(fs.existsSync(path.join(root, p))).toBe(false),
);

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

// The project skill (.claude/skills) is tracked; only agent worktrees and personal settings stay local.
const gitIgnored = (rel: string) =>
  spawnSync('git', ['check-ignore', '-q', rel], { cwd: root }).status === 0;

test('.claude/skills is not git-ignored; worktrees and local settings are', () => {
  expect(gitIgnored('.claude/skills/wattprint-base/SKILL.md')).toBe(false);
  expect(gitIgnored('.claude/skills/wattprint-base/evals/evals.json')).toBe(false);
  expect(gitIgnored('.claude/worktrees/agent-x/package.json')).toBe(true);
  expect(gitIgnored('.claude/settings.local.json')).toBe(true);
});

test('lint, format and jest ignore only .claude/worktrees, not .claude', () => {
  expect(read('eslint.config.js')).toMatch(/'\.claude\/worktrees\/\*\*'/);
  expect(read('eslint.config.js')).not.toMatch(/'\.claude\/\*\*'/);
  const prettierIgnored = read('.prettierignore').split(/\r?\n/);
  expect(prettierIgnored).toContain('.claude/worktrees');
  expect(prettierIgnored).not.toContain('.claude');
  expect(JSON.stringify(pkg.jest.testPathIgnorePatterns)).toContain('<rootDir>/.claude/worktrees/');
  expect(pkg.jest.modulePathIgnorePatterns).toEqual(['<rootDir>/.claude/worktrees/']);
});
