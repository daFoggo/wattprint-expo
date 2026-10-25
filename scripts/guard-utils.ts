import fs from 'fs';
import path from 'path';

// Shared by the guard tests (scripts/*-guard.test.ts): file walking and a single-pass source scanner.
export const root = path.resolve(__dirname, '..');
export const srcDir = path.join(root, 'src');

export const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

export type Scanned = { code: string; literals: string[] };

// Single pass over the source: drops comments (only real comment openers outside of strings)
// and collects the contents of string/template literals. `code` keeps the literals so that JSX
// attributes can still be inspected.
export const scan = (source: string): Scanned => {
  let code = '';
  const literals: string[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
    } else if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
    } else if (c === '"' || c === "'" || c === '`') {
      const start = i;
      i++;
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') i++;
        else if (c !== '`' && source[i] === '\n') break;
        i++;
      }
      i++;
      code += source.slice(start, i);
      literals.push(source.slice(start + 1, i - 1));
    } else {
      code += c;
      i++;
    }
  }
  return { code, literals };
};
