import fs from 'fs';
import path from 'path';

// Uniwind on native silently ignores some Tailwind syntax (a rule whose selector it cannot
// translate is skipped without a warning) and cannot set non-style colour props from `className`.
// This guard fails on the known pitfalls so they cannot creep back in (see README "Uniwind native rules").

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');

// Class tokens (optionally behind variants such as `data-[x=true]:`) that do nothing on native.
const BANNED_CLASSES: { name: string; pattern: RegExp }[] = [
  { name: 'placeholder:', pattern: /(^|[\s'"`:])placeholder:/ },
  { name: 'hover:', pattern: /(^|[\s'"`:])hover:/ },
  { name: 'focus-visible:', pattern: /(^|[\s'"`:])focus-visible:/ },
  { name: 'before:', pattern: /(^|[\s'"`:])before:/ },
  { name: 'after:', pattern: /(^|[\s'"`:])after:/ },
  { name: 'group-* / group/*', pattern: /(^|[\s'"`:])group[-/]/ },
  { name: 'web:', pattern: /(^|[\s'"`:])web:/ },
  { name: 'data-[hover=true]', pattern: /data-\[hover=true\]/ },
  { name: 'data-[focus-visible=true]', pattern: /data-\[focus-visible=true\]/ },
  { name: 'shadow-hard-*', pattern: /(^|[\s'"`:])shadow-hard-/ },
];

// Returns the full opening tag (attributes included) of every `<Tag ...>` occurrence.
const openingTags = (code: string, tag: string): string[] => {
  const tags: string[] = [];
  const start = new RegExp(`<${tag.replace('.', '\\.')}(?=[\\s/>])`, 'g');
  let match: RegExpExecArray | null;
  while ((match = start.exec(code))) {
    let depth = 0;
    let quote: string | null = null;
    let i = match.index + match[0].length;
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (depth === 0 && (c === '"' || c === "'")) quote = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    tags.push(code.slice(match.index, i + 1));
  }
  return tags;
};

// Components whose colour is a non-style prop and the `*ClassName` binding they must carry.
const REQUIRED_BINDINGS: { tag: string; binding: string }[] = [
  { tag: 'ActivityIndicator', binding: 'colorClassName' },
  { tag: 'UIButton.Spinner', binding: 'colorClassName' },
  { tag: 'TextInput', binding: 'placeholderTextColorClassName' },
  { tag: 'UIInput.Input', binding: 'placeholderTextColorClassName' },
];

export const findViolations = (file: string, source: string): string[] => {
  const code = stripComments(source);
  const found: string[] = [];
  for (const { name, pattern } of BANNED_CLASSES) {
    if (pattern.test(code)) found.push(`${file}: unsupported on native: ${name}`);
  }
  for (const { tag, binding } of REQUIRED_BINDINGS) {
    for (const opening of openingTags(code, tag)) {
      if (!opening.includes(binding)) found.push(`${file}: <${tag}> needs ${binding}`);
    }
  }
  return found;
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
      'shadow-hard-2',
    ];
    for (const cls of cases) {
      expect(findViolations('x.tsx', `const a = 'p-2 ${cls}';`)).not.toEqual([]);
    }
  });

  test('ignores comments and identifiers', () => {
    const code = `// web: hover:bg-accent\n/* placeholder:x */\nconst onHover = () => {}; const url = 'https://x.dev/a';`;
    expect(findViolations('x.tsx', code)).toEqual([]);
  });

  test('requires the colour bindings', () => {
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
});

test('src has no Uniwind native pitfalls', () => {
  const files = walk(srcDir)
    .filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))
    .map((f) => path.relative(root, f).replace(/\\/g, '/'));
  expect(files.length).toBeGreaterThan(0);
  const violations = files.flatMap((f) =>
    findViolations(f, fs.readFileSync(path.join(root, f), 'utf8')),
  );
  expect(violations).toEqual([]);
});
