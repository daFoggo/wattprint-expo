import { ESLint } from 'eslint';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { boundaryConfigs } = require('../eslint.boundaries.js') as {
  boundaryConfigs: (features: string[]) => object[];
};

// Lints plain `import` statements as the given file; the feature names exist only in memory.
async function lint(features: string[], filePath: string, source: string): Promise<string[]> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    // The catch-all keeps files outside every boundary scope from being reported as "ignored".
    overrideConfig: [{ files: ['**/*.{ts,tsx}'] }, ...boundaryConfigs(features)] as never,
    cwd: process.cwd(),
  });
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.map((m) => `${m.ruleId}: ${m.message}`);
}

const imp = (source: string) => `import x from '${source}';\nexport { x };\n`;

describe('feature boundaries', () => {
  const file = 'src/features/alpha/api.ts';
  const features = ['alpha', 'beta'];

  test.each([
    '@/app/(home)/index',
    '@/screens/home',
    '@/features/beta/api',
    '@/features/beta',
    '../schemas',
    '../../beta/api',
  ])('forbids %s', async (source) => {
    const messages = await lint(features, file, imp(source));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/^no-restricted-imports/);
  });

  test.each([
    './schemas',
    './hooks/use-thing',
    '@/features/alpha/schemas',
    '@/features/alpha',
    '@/lib/http',
    '@/components/states/error-state',
    '@/i18n',
    '@tanstack/react-query',
    'react-native',
  ])('allows %s', async (source) => {
    expect(await lint(features, file, imp(source))).toEqual([]);
  });

  test('a feature whose name prefixes another is not that other feature', async () => {
    const messages = await lint(
      ['lab', 'lab2'],
      'src/features/lab/api.ts',
      imp('@/features/lab2/x'),
    );
    expect(messages).toHaveLength(1);
  });

  test('applies to files nested in the feature and to tests', async () => {
    expect(
      await lint(features, 'src/features/alpha/screens/a-screen.tsx', imp('@/features/beta/x')),
    ).toHaveLength(1);
    expect(
      await lint(features, 'src/features/alpha/api.test.ts', imp('@/screens/home')),
    ).toHaveLength(1);
  });
});

describe('shared layers', () => {
  const features = ['alpha'];

  test.each([
    ['src/lib/http.ts', '@/components/ui/button'],
    ['src/lib/http.ts', '@/features/alpha/api'],
    ['src/stores/preferences-store.ts', '@/screens/home'],
    ['src/hooks/use-thing.ts', '@/app/_layout'],
    ['src/i18n/index.ts', '@/components/states/error-state'],
    ['src/env.ts', '@/features/alpha/api'],
    ['src/lib/http.ts', '../components/ui/button'],
    ['src/components/states/error-state.tsx', '@/features/alpha/api'],
    ['src/components/ui/button/index.tsx', '@/screens/home'],
    ['src/components/states/error-state.tsx', '@/app/_layout'],
  ])('%s must not import %s', async (file, source) => {
    const messages = await lint(features, file, imp(source));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/^no-restricted-imports/);
  });

  test.each([
    ['src/lib/http.ts', '@/lib/errors'],
    ['src/lib/http.ts', './errors'],
    ['src/stores/preferences-store.ts', '@/lib/storage'],
    ['src/hooks/use-thing.ts', '@/stores/preferences-store'],
    ['src/components/states/error-state.tsx', '@/components/ui/button'],
    ['src/components/states/error-state.tsx', '@/lib/errors'],
    ['src/screens/home/index.tsx', '@/features/alpha/screens/a-screen'],
    ['src/app/(home)/index.tsx', '@/screens/home'],
    ['src/features/alpha/api.ts', '@/stores/preferences-store'],
  ])('%s may import %s', async (file, source) => {
    expect(await lint(features, file, imp(source))).toEqual([]);
  });

  test('without features only the shared scopes are restricted', async () => {
    expect(await lint([], 'src/lib/http.ts', imp('@/components/ui/button'))).toHaveLength(1);
    expect(await lint([], 'src/screens/home/index.tsx', imp('@/features/x/api'))).toEqual([]);
  });
});
