/* global __dirname */
// Prints WCAG 2.x contrast ratios for the token pairs in src/global.css (light and dark).
// Usage: node scripts/contrast-report.js
// Formula: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio (relative luminance of sRGB).
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'global.css'), 'utf8');

function readTheme(name) {
  const open = css.indexOf(`:where(.${name}, .${name} *) {`);
  if (open === -1) throw new Error(`theme block .${name} not found in src/global.css`);
  const block = css.slice(open, css.indexOf('}', open));
  const tokens = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(\d+) (\d+) (\d+);/g)) {
    tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return tokens;
}

const channel = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// A colour is a token ("card") or an alpha composite over a parent token ("destructive/60@background"), which is how
// classes such as `bg-destructive/60` render: the token at 60% opacity over what is behind it.
const resolve = (theme, spec) => {
  const m = spec.match(/^([a-z-]+)\/(\d+)@([a-z-]+)$/);
  if (!m) return theme[spec];
  const alpha = Number(m[2]) / 100;
  return theme[m[1]].map((v, i) => alpha * v + (1 - alpha) * theme[m[3]][i]);
};

// [foreground, background, kind, only]. text = 4.5:1 (WCAG 1.4.3), ui = 3:1 (WCAG 1.4.11).
// `only` limits a row to one theme when the class exists only there (e.g. `dark:bg-input/30`).
const PAIRS = [
  ['foreground', 'background', 'text'],
  ['card-foreground', 'card', 'text'],
  ['popover-foreground', 'popover', 'text'],
  ['primary-foreground', 'primary', 'text'],
  ['secondary-foreground', 'secondary', 'text'],
  ['accent-foreground', 'accent', 'text'],
  ['destructive-foreground', 'destructive', 'text'],
  ['muted-foreground', 'background', 'text'],
  ['muted-foreground', 'muted', 'text'],
  ['destructive', 'background', 'text'],
  // Rendered pairs of the dark destructive Button (`dark:bg-destructive/60`, pressed `/50`) and the dark Input fill.
  ['destructive-foreground', 'destructive/60@background', 'text', 'dark'],
  ['destructive-foreground', 'destructive/60@card', 'text', 'dark'],
  ['destructive-foreground', 'destructive/50@background', 'text', 'dark'],
  ['muted-foreground', 'input/30@background', 'text', 'dark'],
  ['primary', 'background', 'ui'],
  ['border', 'background', 'ui'],
  ['input', 'background', 'ui'],
  ['ring', 'background', 'ui'],
  // Invalid Input border (`data-[invalid=true]:border-destructive/40`).
  ['destructive/40@background', 'background', 'ui'],
];

const themes = { light: readTheme('light'), dark: readTheme('dark') };
console.log('| pair (fg on bg) | kind | light | dark |');
for (const [fg, bg, kind, only] of PAIRS) {
  const cells = Object.entries(themes).map(([name, t]) => {
    if (only && only !== name) return 'n/a';
    const value = ratio(resolve(t, fg), resolve(t, bg));
    const min = kind === 'text' ? 4.5 : 3;
    return `${value.toFixed(2)} ${value >= min ? 'pass' : 'FAIL'}`;
  });
  console.log(`| ${fg} on ${bg} | ${kind} | ${cells.join(' | ')} |`);
}
