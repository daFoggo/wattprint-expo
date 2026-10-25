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
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground token, background token, kind]. text = 4.5:1 (WCAG 1.4.3), ui = 3:1 (WCAG 1.4.11).
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
  ['primary', 'background', 'ui'],
  ['border', 'background', 'ui'],
  ['input', 'background', 'ui'],
  ['ring', 'background', 'ui'],
];

const themes = { light: readTheme('light'), dark: readTheme('dark') };
console.log('| pair (fg on bg) | kind | light | dark |');
for (const [fg, bg, kind] of PAIRS) {
  const cells = Object.values(themes).map((t) => {
    const value = ratio(t[fg], t[bg]);
    const min = kind === 'text' ? 4.5 : 3;
    return `${value.toFixed(2)} ${value >= min ? 'pass' : 'FAIL'}`;
  });
  console.log(`| ${fg} on ${bg} | ${kind} | ${cells.join(' | ')} |`);
}
