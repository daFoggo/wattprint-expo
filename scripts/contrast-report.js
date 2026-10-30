/* global __dirname */
// Prints WCAG 2.x contrast ratios for the token pairs in src/global.css (light and dark).
// Usage: node scripts/contrast-report.js
// Formula: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio (relative luminance of sRGB).
const fs = require('fs');
const path = require('path');

const readCss = () => fs.readFileSync(path.join(__dirname, '..', 'src', 'global.css'), 'utf8');

function readTheme(name, css = readCss()) {
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
  const m = spec.match(/^([a-z-]+)\/(\d+(?:\.\d+)?)@([a-z-]+)$/);
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
  ['primary-foreground', 'primary-strong', 'text'],
  // `primary-strong` is the small-text and Button fill; `primary` is the brighter token for shapes (3:1 only).
  ['primary-strong', 'background', 'text'],
  ['primary-strong', 'card', 'text'],
  ['secondary-foreground', 'secondary', 'text'],
  ['accent-foreground', 'accent', 'text'],
  // Solid destructive is never rendered in dark (the Button uses `dark:bg-destructive/60`), so only light is checked.
  ['destructive-foreground', 'destructive', 'text', 'light'],
  ['muted-foreground', 'background', 'text'],
  ['muted-foreground', 'muted', 'text'],
  ['destructive', 'background', 'text'],
  // Rendered pairs of the dark destructive Button (`dark:bg-destructive/60`, pressed `/50`) and the dark Input fill.
  ['destructive-foreground', 'destructive/60@background', 'text', 'dark'],
  ['destructive-foreground', 'destructive/60@card', 'text', 'dark'],
  ['destructive-foreground', 'destructive/50@background', 'text', 'dark'],
  ['muted-foreground', 'input/30@background', 'text', 'dark'],
  ['foreground', 'input/30@background', 'text', 'dark'],
  // Dark outline Button fill (`dark:bg-input/[0.045]`, pressed `/[0.075]`) under its label.
  ['foreground', 'input/4.5@background', 'text', 'dark'],
  ['foreground', 'input/7.5@background', 'text', 'dark'],
  ['primary', 'background', 'ui'],
  // Switch track, Progress fill and chart bars on a Card.
  ['primary', 'card', 'ui'],
  // Progress fill (`bg-primary-strong`) on its track (`bg-primary/20`) on a Card.
  ['primary-strong', 'primary/20@card', 'ui'],
  // Switch thumb (`accent-switch-thumb`) on the on track (`accent-primary`), and next to the card around it.
  // Thumb vs card is dark only (light is white on white; the track carries it there). Thumb vs off track
  // (`accent-input`) is checked in both themes.
  ['switch-thumb', 'primary', 'ui'],
  ['switch-thumb', 'card', 'ui', 'dark'],
  ['switch-thumb', 'input', 'ui'],
  ['muted-foreground', 'card', 'text'],
  // `border` is for dividers: decorative, so it is not a pair. The Input boundary is `border-input`.
  ['input', 'background', 'ui'],
  ['input', 'card', 'ui'],
  ['ring', 'background', 'ui'],
  ['ring', 'card', 'ui'],
  // The Input is a filled field without a border (like Sense), so focus (`border-ring`) is checked against the fill
  // (`bg-secondary`), and the invalid border (`border-destructive`) against it too.
  ['ring', 'secondary', 'ui'],
  ['destructive', 'secondary', 'ui'],
];

// Pairs that fail on purpose, as "theme:fg on bg". A test fails if one of these starts passing (stale entry).
const KNOWN_FAILURES = [];

const MIN = { text: 4.5, ui: 3 };

// One row per pair and theme: { id, theme, fg, bg, kind, value, min, pass, known }.
function evaluate(themes = { light: readTheme('light'), dark: readTheme('dark') }) {
  const rows = [];
  for (const [fg, bg, kind, only] of PAIRS) {
    for (const [theme, t] of Object.entries(themes)) {
      if (only && only !== theme) continue;
      const value = ratio(resolve(t, fg), resolve(t, bg));
      const id = `${theme}:${fg} on ${bg}`;
      rows.push({
        id,
        theme,
        fg,
        bg,
        kind,
        value,
        min: MIN[kind],
        pass: value >= MIN[kind],
        known: KNOWN_FAILURES.includes(id),
      });
    }
  }
  return rows;
}

function report() {
  const rows = evaluate();
  console.log('| pair (fg on bg) | kind | light | dark |');
  for (const [fg, bg, kind, only] of PAIRS) {
    const cells = ['light', 'dark'].map((theme) => {
      if (only && only !== theme) return 'n/a';
      const r = rows.find((x) => x.id === `${theme}:${fg} on ${bg}`);
      return `${r.value.toFixed(2)} ${r.pass ? 'pass' : 'FAIL'}`;
    });
    console.log(`| ${fg} on ${bg} | ${kind} | ${cells.join(' | ')} |`);
  }
}

if (require.main === module) report();

module.exports = {
  readTheme,
  channel,
  luminance,
  ratio,
  resolve,
  PAIRS,
  KNOWN_FAILURES,
  MIN,
  evaluate,
};
