#!/usr/bin/env node
// Median / min / max per numeric column of a CSV, optionally grouped by leading columns.
// Usage: node scripts/bench/stats.js <file.csv> [groupColumn ...]
const fs = require('node:fs');

const [file, ...groupCols] = process.argv.slice(2);
if (!file) {
  console.error('usage: stats.js <file.csv> [groupColumn ...]');
  process.exit(1);
}

const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
const cols = header.split(',');
const rows = lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const groups = new Map();
for (const row of rows) {
  const key = groupCols.map((c) => row[c]).join(' | ');
  groups.set(key, [...(groups.get(key) ?? []), row]);
}

for (const [key, members] of groups) {
  const parts = [];
  for (const col of cols.filter((c) => !groupCols.includes(c) && c !== 'run')) {
    const xs = members
      .map((r) => r[col])
      .filter((v) => v !== undefined && v !== '')
      .map(Number)
      .filter(Number.isFinite);
    if (xs.length === 0) continue;
    parts.push(
      `${col}: med ${median(xs)} min ${Math.min(...xs)} max ${Math.max(...xs)} (n=${xs.length})`,
    );
  }
  console.log(`${key || 'all'} -> ${parts.join('; ')}`);
}
