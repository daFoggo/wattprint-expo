import fs from 'fs';
import path from 'path';

import { root, scan, srcDir, walk } from './guard-utils';

// Design-system guard (docs/design-system.md): colours come from semantic tokens only.
// Fails, inside string/template literals of src (comments are stripped), on:
//   1. hex colours ("#fff", "#1a2b3c", "bg-[#fff]") and rgb()/hsl()/oklch()-style colour functions;
//   2. `dark:` colour utilities (the tokens switch with the theme by themselves) outside src/components/ui.
// Not checked: Tailwind palette classes (bg-red-500), named colours, numbers, src/global.css (the token
// source, not a .ts/.tsx file) and test files.

// Vendored gluestack code keeps its upstream `dark:` pairs (button, input).
const DARK_PAIRS_ALLOWED_PREFIX = 'src/components/ui/';

// Colour literals that are legitimate. Key: file relative to the repo root. Value: the allowed literal
// start and why. Keep this list empty if you can.
const COLOUR_LITERAL_ALLOWED: Record<string, { literal: string; reason: string }> = {
  'src/lib/nav-theme.ts': {
    literal: 'rgb(',
    reason: 'turns a token triple ("255 255 255") into the CSS colour React Navigation requires',
  },
};

const HEX = /(?:^|[^\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z])/;
const COLOUR_FUNCTION = /(?:^|[^\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;

// `dark:` + utility prefixes that carry a colour when followed by a token or palette name.
const COLOUR_PREFIX =
  /^(?:bg|text|border|accent|fill|stroke|ring|shadow|outline|decoration|caret|divide|from|via|to)-/;
// Same prefixes, but the utility is a size, width, alignment or style, not a colour.
const NOT_A_COLOUR =
  /^(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)|border-(?:\d+|[xytrblse]|[xytrblse]-\d+|solid|dashed|dotted|double|hidden|none|collapse|separate|spacing.*)|shadow-(?:xs|sm|md|lg|xl|2xl|none|inner)|ring-(?:\d+|inset)|outline-(?:\d+|none|dashed|dotted|double|hidden|offset-.*)|divide-[xy](?:-\d+|-reverse)?|decoration-(?:\d+|solid|double|dotted|dashed|wavy|auto|from-font)|bg-(?:auto|cover|contain|fixed|local|scroll|center|top|bottom|left|right|repeat.*|no-repeat|clip-.*|origin-.*|blend-.*|none|linear-.*|radial-.*|conic-.*)|stroke-\d+)(?:$)/;

const hasDarkColour = (token: string): boolean => {
  const segments = token.split(':');
  const utility = segments[segments.length - 1];
  if (!segments.slice(0, -1).includes('dark')) return false;
  return COLOUR_PREFIX.test(utility) && !NOT_A_COLOUR.test(utility);
};

export const findDesignViolations = (file: string, source: string): string[] => {
  const { literals } = scan(source);
  const found = new Set<string>();
  const allowed = COLOUR_LITERAL_ALLOWED[file];
  const allowDark = file.startsWith(DARK_PAIRS_ALLOWED_PREFIX);
  for (const literal of literals) {
    const hex = HEX.test(literal);
    const fn = COLOUR_FUNCTION.test(literal);
    if (hex) found.add(`${file}: hex colour literal in "${literal.trim().slice(0, 40)}"`);
    if (fn && !(allowed && literal.includes(allowed.literal))) {
      found.add(`${file}: colour function literal in "${literal.trim().slice(0, 40)}"`);
    }
    if (!allowDark) {
      for (const token of literal.split(/\s+/)) {
        if (hasDarkColour(token)) found.add(`${file}: dark: colour pair "${token}" (use a token)`);
      }
    }
  }
  return [...found];
};

describe('findDesignViolations (self-test)', () => {
  const check = (code: string, file = 'src/screens/x.tsx') => findDesignViolations(file, code);

  test('flags hex colours in class strings, style props and templates', () => {
    for (const hex of ['#fff', '#FFFF', '#1a2b3c', '#1a2b3c4d']) {
      expect(check(`const a = 'bg-[${hex}] p-2';`)).not.toEqual([]);
      expect(check(`const s = { color: "${hex}" };`)).not.toEqual([]);
      expect(check(`const a = \`border-[${hex}]\`;`)).not.toEqual([]);
    }
  });

  test('flags colour functions', () => {
    for (const fn of [
      'rgb(0,0,0)',
      'rgba(0, 0, 0, .5)',
      'hsl(0 0% 0%)',
      'hsla(0,0%,0%,1)',
      'oklch(0.5 0 0)',
    ]) {
      expect(check(`const s = { color: '${fn}' };`)).not.toEqual([]);
      expect(check(`const a = 'bg-[${fn}]';`)).not.toEqual([]);
    }
  });

  test('does not flag hex-like text, anchors, entities or identifiers', () => {
    const code = [
      "const url = 'https://x.dev/page#section';",
      "const label = 'Item #1 of 3';",
      "const entity = '&#169;';",
      "const word = '#hashtag';",
      "const fn = 'srgb(1)';",
      "const names = ['bgrgb(', 'prergb('];",
    ].join('\n');
    expect(check(code)).toEqual([]);
  });

  test('ignores comments', () => {
    expect(check("// color: '#fff'\n/* rgb(0,0,0) dark:bg-black */\nconst a = 'p-2';")).toEqual([]);
  });

  test('flags dark: colour pairs, also behind other variants', () => {
    for (const cls of [
      'dark:bg-black',
      'dark:text-white',
      'dark:border-border/90',
      'dark:data-[active=true]:bg-accent/50',
      'active:dark:bg-muted',
      'dark:accent-primary',
    ]) {
      expect(check(`const a = 'p-2 ${cls}';`)).not.toEqual([]);
    }
  });

  test('does not flag dark: with a non-colour utility or light-only colours', () => {
    for (const cls of [
      'dark:text-sm',
      'dark:border-2',
      'dark:border-t',
      'dark:shadow-lg',
      'dark:ring-2',
      'bg-background',
      'text-foreground',
      'border-border',
    ]) {
      expect(check(`const a = 'p-2 ${cls}';`)).toEqual([]);
    }
  });

  test('dark: pairs are allowed only under src/components/ui', () => {
    const code = "const a = 'dark:bg-input/30';";
    expect(check(code, 'src/components/ui/input/index.tsx')).toEqual([]);
    expect(check(code, 'src/components/states/x.tsx')).not.toEqual([]);
  });

  test('hex colours are never allowed, not even in vendored code', () => {
    expect(check("const a = 'bg-[#fff]';", 'src/components/ui/button/index.tsx')).not.toEqual([]);
  });

  test('the explicit allow-list covers only its literal in its file', () => {
    const code = 'const c = `rgb(${parts.join(", ")})`;';
    expect(check(code, 'src/lib/nav-theme.ts')).toEqual([]);
    expect(check(code, 'src/lib/other.ts')).not.toEqual([]);
    expect(check("const c = 'hsl(0 0% 0%)';", 'src/lib/nav-theme.ts')).not.toEqual([]);
  });
});

test('src has no hard-coded colours and no dark: colour pairs outside src/components/ui', () => {
  const files = walk(srcDir)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f))
    .map((f) => path.relative(root, f).replace(/\\/g, '/'));
  expect(files.length).toBeGreaterThan(0);
  const violations = files.flatMap((f) =>
    findDesignViolations(f, fs.readFileSync(path.join(root, f), 'utf8')),
  );
  expect(violations).toEqual([]);
});

test('every allow-listed file exists and still needs its allowance', () => {
  for (const [file, { literal }] of Object.entries(COLOUR_LITERAL_ALLOWED)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    expect(scan(source).literals.some((l) => l.includes(literal))).toBe(true);
  }
});
