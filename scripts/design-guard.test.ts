import fs from 'fs';
import path from 'path';

import { root, scan, srcDir, walk } from './guard-utils';

// Design-system guard (docs/design-system.md): colours come from semantic tokens only.
// Fails, in the string/template literals of src (comments are stripped) and in colour-named style
// props, on:
//   1. hex colours in a colour position, colour functions (rgb(), hsl(), oklch(), color-mix(), ...)
//      and literal colour values of `*Color` style props or attributes (`color: 'white'`);
//   2. `dark:` colour utilities (the tokens switch with the theme by themselves) outside src/components/ui.
// Not checked: Tailwind palette classes (bg-red-500), `text-(--var)` syntax, numbers, src/global.css (the
// token source, not a .ts/.tsx file) and test files.

// Vendored gluestack code keeps its upstream `dark:` pairs (today: button, input). Any file under it.
const DARK_PAIRS_ALLOWED_PREFIX = 'src/components/ui/';

// Colour literals that are legitimate. Key: file relative to the repo root. `literal` must equal the whole
// string/template literal. Keep this list empty if you can.
const COLOUR_LITERAL_ALLOWED: Record<string, { literal: string; reason: string }> = {
  'src/lib/nav-theme.ts': {
    literal: "rgb(${parts.join(', ')})",
    reason: 'turns a token triple ("255 255 255") into the CSS colour React Navigation requires',
  },
};

const HEX_DIGITS = '(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})';
// Hex inside an arbitrary Tailwind value: bg-[#fff], border-[color:#1a2b3c]/50, shadow-[0_0_4px_#000].
const HEX_IN_BRACKETS = new RegExp(`\\[[^\\]]*#${HEX_DIGITS}(?![0-9a-zA-Z])[^\\]]*\\]`);
// A literal that is only a 6 or 8 digit hex colour: const RED = '#ff0000'. (#add, #123 alone are text.)
const HEX_WHOLE_LITERAL = /^\s*#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})\s*$/;
// A colour-named key or attribute with any hex literal: color: '#fff', placeholderTextColor="#abc".
const HEX_IN_COLOUR_PROP = new RegExp(
  `\\w*[cC]olor\\s*[:=]\\s*\\{?\\s*(['"\`])#${HEX_DIGITS}(?![0-9a-zA-Z])\\1`,
);
// Colour functions with colour-like arguments; "lab(beta)" in a sentence does not match.
const COLOUR_FUNCTION =
  /(?:^|[^\w-])(?:(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?:[\d.+-]|var\(|from\b|none\b|\$\{)|color-mix\(\s*in\s)/;
// A literal colour value for a *Color style key or attribute: color: 'white', tintColor="red".
const NAMED_COLOUR_PROP = /\w*[cC]olor\s*[:=]\s*\{?\s*(['"`])([^'"`$]+)\1/g;
const ALLOWED_COLOUR_VALUES = new Set(['transparent']);

// `dark:` + utility prefixes that carry a colour when followed by a token or palette name.
const COLOUR_PREFIX =
  /^(?:bg|text|border|accent|fill|stroke|ring|ring-offset|shadow|text-shadow|outline|decoration|caret|divide|from|via|to)-/;
// Same prefixes, but the utility is a size, width, alignment, offset, position or style, not a colour.
const NOT_A_COLOUR = new RegExp(
  '^(?:' +
    [
      'text-(?:xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)',
      'text-shadow-(?:2xs|xs|sm|md|lg|none)',
      'border-(?:\\d+|[xytrblse]|[xytrblse]-\\d+|solid|dashed|dotted|double|hidden|none|collapse|separate|spacing.*)',
      'shadow-(?:2xs|xs|sm|md|lg|xl|2xl|none|inner)',
      'ring-(?:\\d+|inset|offset-\\d+)',
      'outline-(?:\\d+|none|dashed|dotted|double|hidden|offset-.*)',
      'divide-[xy](?:-\\d+|-reverse)?',
      'decoration-(?:\\d+|solid|double|dotted|dashed|wavy|auto|from-font)',
      '(?:from|via|to)-\\d+%',
      'bg-(?:auto|cover|contain|fixed|local|scroll|center|top|bottom|left|right|repeat.*|no-repeat|clip-.*|origin-.*|blend-.*|none|linear-.*|radial-.*|conic-.*|gradient-.*)',
      'stroke-\\d+',
    ].join('|') +
    ')$',
);

const hasDarkColour = (token: string): boolean => {
  const segments = token.split(':');
  if (!segments.slice(0, -1).includes('dark')) return false;
  // Tailwind important modifier: `!bg-black` (v3 style) or `bg-black!` (v4 style).
  const utility = segments[segments.length - 1].replace(/^!/, '').replace(/!$/, '');
  if (!COLOUR_PREFIX.test(utility) || NOT_A_COLOUR.test(utility)) return false;
  // Arbitrary values (`text-[13px]`, `shadow-[0_0_4px_#000]`): a colour only when it says so.
  const arbitrary = utility.match(/-\[([^\]]*)\]/);
  if (arbitrary) return /^(?:color:|#|rgba?\(|hsla?\(|oklch\(|var\(--)/.test(arbitrary[1]);
  return true;
};

export const findDesignViolations = (file: string, source: string): string[] => {
  const { code, literals } = scan(source);
  const found = new Set<string>();
  const allowedLiteral = COLOUR_LITERAL_ALLOWED[file]?.literal;
  const allowDark = file.startsWith(DARK_PAIRS_ALLOWED_PREFIX);
  const show = (text: string) => text.trim().slice(0, 40);

  for (const literal of literals) {
    if (HEX_IN_BRACKETS.test(literal) || HEX_WHOLE_LITERAL.test(literal)) {
      found.add(`${file}: hex colour literal in "${show(literal)}"`);
    }
    if (COLOUR_FUNCTION.test(literal) && literal !== allowedLiteral) {
      found.add(`${file}: colour function literal in "${show(literal)}"`);
    }
    if (!allowDark) {
      for (const token of literal.split(/\s+/)) {
        if (hasDarkColour(token)) found.add(`${file}: dark: colour pair "${token}" (use a token)`);
      }
    }
  }

  // Style props and attributes are looked up in `code` (literals kept, comments removed).
  const hexProp = HEX_IN_COLOUR_PROP.exec(code);
  if (hexProp) found.add(`${file}: hex colour literal in "${show(hexProp[0])}"`);
  for (const match of code.matchAll(NAMED_COLOUR_PROP)) {
    const value = match[2].trim();
    if (!ALLOWED_COLOUR_VALUES.has(value) && !/^#/.test(value)) {
      found.add(`${file}: literal colour value in "${show(match[0])}"`);
    }
  }
  return [...found];
};

describe('findDesignViolations (self-test)', () => {
  const check = (code: string, file = 'src/screens/x.tsx') => findDesignViolations(file, code);

  test('flags hex colours in arbitrary class values, style props and attributes', () => {
    for (const hex of ['#fff', '#FFFF', '#1a2b3c', '#1a2b3c4d']) {
      expect(check(`const a = 'bg-[${hex}] p-2';`)).not.toEqual([]);
      expect(check(`const a = \`border-[color:${hex}]/50\`;`)).not.toEqual([]);
      expect(check(`const s = { color: "${hex}" };`)).not.toEqual([]);
      expect(check(`const s = { backgroundColor: '${hex}' };`)).not.toEqual([]);
      expect(check(`<TextInput placeholderTextColor="${hex}" />;`)).not.toEqual([]);
    }
    expect(check("const RED = '#ff0000';")).not.toEqual([]);
    expect(check("const RED = '#ff000080';")).not.toEqual([]);
  });

  test('flags colour functions', () => {
    for (const fn of [
      'rgb(0,0,0)',
      'rgba(0, 0, 0, .5)',
      'hsl(0 0% 0%)',
      'hsla(0,0%,0%,1)',
      'oklch(0.5 0 0)',
      'lab(50 10 10)',
      'rgb(var(--x))',
      'color-mix(in srgb, red 50%, blue)',
    ]) {
      expect(check(`const s = { color: '${fn}' };`)).not.toEqual([]);
      expect(check(`const a = 'bg-[${fn}]';`)).not.toEqual([]);
    }
  });

  test('flags literal colour values of *Color style props', () => {
    for (const code of [
      "const s = { color: 'white' };",
      'const s = { borderColor: "red" };',
      '<ActivityIndicator color="black" />;',
      "<View style={{ backgroundColor: 'rebeccapurple' }} />;",
    ]) {
      expect(check(code)).not.toEqual([]);
    }
  });

  test('does not flag plain text, anchors, entities, identifiers or non-literal colours', () => {
    const code = [
      "const url = 'https://x.dev/page#section';",
      "const label = 'Item #123 of 3';",
      "const tag = '#add';",
      "const tag2 = 'Tag #fade and #cafe';",
      "const entity = '&#169;';",
      "const word = '#hashtag';",
      "const text = 'Use lab(beta) or the rgb(a) idea, lch (sic)';",
      "const fn = 'srgb(1)';",
      "const names = ['bgrgb(', 'prergb('];",
      "const s = { color: tokens.primary, tintColor: undefined, backgroundColor: 'transparent' };",
      "const c = useCSSVariable('--background');",
    ].join('\n');
    expect(check(code)).toEqual([]);
  });

  test('ignores comments', () => {
    expect(
      check("// color: '#fff'\n/* rgb(0,0,0) dark:bg-black color: 'red' */\nconst a = 'p-2';"),
    ).toEqual([]);
  });

  test('flags dark: colour pairs, also behind other variants and important modifiers', () => {
    for (const cls of [
      'dark:bg-black',
      'dark:text-white',
      'dark:border-border/90',
      'dark:data-[active=true]:bg-accent/50',
      'active:dark:bg-muted',
      'dark:accent-primary',
      'dark:!bg-black',
      'dark:bg-black!',
      'dark:ring-offset-black',
      'dark:text-shadow-red-500',
      'dark:from-primary',
      'dark:shadow-[0_0_4px_#000]',
    ]) {
      expect(check(`const a = 'p-2 ${cls}';`)).not.toEqual([]);
    }
  });

  test('does not flag dark: with a non-colour utility or token-only classes', () => {
    for (const cls of [
      'dark:text-sm',
      'dark:text-[13px]',
      'dark:border-2',
      'dark:border-t',
      'dark:shadow-lg',
      'dark:shadow-2xs',
      'dark:ring-2',
      'dark:ring-offset-2',
      'dark:to-50%',
      'dark:text-shadow-sm',
      'dark:bg-linear-to-r',
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
    expect(check(code, 'src/components/ui/new-part/index.tsx')).toEqual([]);
    expect(check(code, 'src/components/states/x.tsx')).not.toEqual([]);
  });

  test('hex colours and colour props are never allowed, not even in vendored code', () => {
    expect(check("const a = 'bg-[#fff]';", 'src/components/ui/button/index.tsx')).not.toEqual([]);
    expect(
      check("const s = { color: 'white' };", 'src/components/ui/button/index.tsx'),
    ).not.toEqual([]);
  });

  test('the allow-list covers only the exact literal in its file', () => {
    const exact = "const c = `rgb(${parts.join(', ')})`;";
    expect(check(exact, 'src/lib/nav-theme.ts')).toEqual([]);
    expect(check(exact, 'src/lib/other.ts')).not.toEqual([]);
    for (const other of [
      "const c = 'hsl(0 0% 0%)';",
      "const c = 'rgb(0, 0, 0)';",
      'const c = `rgb(${a})`;',
      'const c = `rgb(${parts.join(", ")})`;',
    ]) {
      expect(check(other, 'src/lib/nav-theme.ts')).not.toEqual([]);
    }
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

test('every allow-listed file exists and still contains its exact literal', () => {
  for (const [file, { literal }] of Object.entries(COLOUR_LITERAL_ALLOWED)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    expect(scan(source).literals).toContain(literal);
  }
});
