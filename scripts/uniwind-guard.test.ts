import fs from 'fs';
import path from 'path';

import { root, scan, srcDir, walk } from './guard-utils';

// Uniwind on native silently ignores some Tailwind syntax (a rule whose selector it cannot
// translate is skipped without a warning) and cannot set non-style colour props from `className`.
// This guard fails on the known pitfalls so they cannot creep back in (see README "Uniwind native rules").
// Scope: class tokens inside string/template literals, the colour bindings of ActivityIndicator,
// TextInput and the Switch track (plus the gluestack wrappers around them), and a Switch imported
// from 'react-native' outside src/components/ui. Svg/Lucide icons are not checked.

const BANNED_VARIANTS = new Set([
  'placeholder',
  'hover',
  'focus-visible',
  'before',
  'after',
  'web',
  'data-[hover=true]',
  'data-[focus-visible=true]',
]);

// Reasons why one class token does nothing on native; empty when it is fine.
const tokenProblems = (token: string): string[] => {
  const segments = token.split(':');
  const utility = segments[segments.length - 1];
  const problems: string[] = [];
  for (const variant of segments.slice(0, -1)) {
    if (BANNED_VARIANTS.has(variant)) problems.push(`${variant}:`);
    else if (/^group[-/]/.test(variant)) problems.push('group-* variant');
  }
  if (/^group\//.test(utility)) problems.push('group/*');
  if (/^shadow-hard-/.test(utility)) problems.push('shadow-hard-*');
  return problems;
};

// Returns the full opening tag (attributes included) of every real JSX `<Tag ...>`; generics such
// as `useRef<TextInput>(null)` are not preceded by a JSX-start character and are skipped.
const openingTags = (code: string, tag: string): string[] => {
  const tags: string[] = [];
  const start = new RegExp(`(?:^|[\\s({>?:&|=])<${tag.replace('.', '\\.')}(?=[\\s/])`, 'gm');
  let match: RegExpExecArray | null;
  while ((match = start.exec(code))) {
    const begin = match.index + match[0].indexOf('<');
    let depth = 0;
    let quote: string | null = null;
    let i = begin + 1 + tag.length;
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (depth === 0 && (c === '"' || c === "'")) quote = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    tags.push(code.slice(begin, i + 1));
  }
  return tags;
};

// Components whose colour is a non-style prop and the `*ClassName` binding they must carry.
const REQUIRED_BINDINGS: { tag: string; binding: string }[] = [
  { tag: 'ActivityIndicator', binding: 'colorClassName' },
  { tag: 'UIButton.Spinner', binding: 'colorClassName' },
  { tag: 'TextInput', binding: 'placeholderTextColorClassName' },
  { tag: 'UIInput.Input', binding: 'placeholderTextColorClassName' },
  { tag: 'UISwitch', binding: 'trackColorOnClassName' },
];

// `import { Switch } from 'react-native'` (also `Switch as X`, among other names). The vendored
// `src/components/ui/switch` wraps it with the track and thumb bindings; use that one instead.
const importsRNSwitch = (code: string): boolean =>
  /import\s*(?:[\w$]+\s*,\s*)?\{[^}]*\bSwitch\b[^}]*\}\s*from\s*['"]react-native['"]/.test(code);

const VENDORED_UI = 'src/components/ui/';

export const findViolations = (file: string, source: string): string[] => {
  const { code, literals } = scan(source);
  const found = new Set<string>();
  if (!file.startsWith(VENDORED_UI) && importsRNSwitch(source)) {
    found.add(`${file}: Switch from 'react-native' (use @/components/ui/switch)`);
  }
  for (const literal of literals) {
    for (const token of literal.split(/\s+/)) {
      for (const problem of tokenProblems(token)) {
        found.add(`${file}: unsupported on native: ${problem}`);
      }
    }
  }
  for (const { tag, binding } of REQUIRED_BINDINGS) {
    for (const opening of openingTags(code, tag)) {
      if (!opening.includes(binding)) found.add(`${file}: <${tag}> needs ${binding}`);
    }
  }
  return [...found];
};

describe('findViolations (self-test)', () => {
  test('flags every banned class, also behind variants', () => {
    const cases = [
      'placeholder:text-muted-foreground',
      'hover:bg-accent',
      'focus-visible:ring-2',
      'before:content-[""]',
      'after:block',
      'group-hover:flex',
      'group/modal',
      'web:outline-none',
      'data-[focus=true]:web:ring-2',
      'data-[hover=true]:bg-accent',
      'dark:data-[focus-visible=true]:bg-accent',
      'shadow-hard-2',
    ];
    for (const cls of cases) {
      expect(findViolations('x.tsx', `const a = 'p-2 ${cls}';`)).not.toEqual([]);
      expect(findViolations('x.tsx', `const a = \`p-2 ${cls}\`;`)).not.toEqual([]);
    }
  });

  test('ignores comments, identifiers, object keys and non-class strings', () => {
    const code = [
      '// web: hover:bg-accent',
      '/* placeholder:x */',
      "const onHover = () => {}; const url = 'https://x.dev/a';",
      'const styles = { hover: 1, web: 2, group: 3 };',
      '<View testID="group-list" accessibilityLabel="web" />;',
    ].join('\n');
    expect(findViolations('x.tsx', code)).toEqual([]);
  });

  test('a glob inside a string does not open a block comment', () => {
    const code = "const accept = 'image/*';\nconst cls = 'p-2 hover:bg-accent';";
    expect(findViolations('x.tsx', code)).not.toEqual([]);
  });

  test('requires the colour bindings on real JSX tags only', () => {
    expect(findViolations('x.tsx', '<ActivityIndicator className="m-2" />')).not.toEqual([]);
    expect(
      findViolations(
        'x.tsx',
        '<ActivityIndicator onLayout={() => 1} colorClassName="accent-primary" />',
      ),
    ).toEqual([]);
    expect(findViolations('x.tsx', '<TextInput className="p-2" />')).not.toEqual([]);
    expect(
      findViolations('x.tsx', '<UIInput.Input placeholderTextColorClassName="accent-muted" />'),
    ).toEqual([]);
  });

  test('requires the track colour binding on UISwitch', () => {
    expect(findViolations('x.tsx', '<UISwitch value />')).not.toEqual([]);
    expect(findViolations('x.tsx', '<UISwitch trackColorOnClassName="accent-primary" />')).toEqual(
      [],
    );
  });

  test("flags Switch imported from 'react-native' outside src/components/ui", () => {
    const rn = "import { Switch } from 'react-native';";
    expect(findViolations('src/screens/x.tsx', rn)).not.toEqual([]);
    expect(
      findViolations('src/screens/x.tsx', "import { View, Switch as S } from 'react-native';"),
    ).not.toEqual([]);
    expect(findViolations('src/components/ui/switch/index.tsx', rn)).toEqual([]);
    expect(findViolations('src/screens/x.tsx', "import { View } from 'react-native';")).toEqual([]);
  });

  test('generics and type positions are not JSX tags', () => {
    const code =
      'const ref = useRef<TextInput>(null);\ntype P = React.ComponentProps<typeof TextInput>;';
    expect(findViolations('x.tsx', code)).toEqual([]);
  });
});

test('src has no Uniwind native pitfalls', () => {
  const files = walk(srcDir)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f))
    .map((f) => path.relative(root, f).replace(/\\/g, '/'));
  expect(files.length).toBeGreaterThan(0);
  const violations = files.flatMap((f) =>
    findViolations(f, fs.readFileSync(path.join(root, f), 'utf8')),
  );
  expect(violations).toEqual([]);
});
