#!/usr/bin/env node
// Reads logcat text on stdin, picks the [BENCH] JSON entries and prints one value.
// Usage: bench-field.js count <event>            -> number of entries with that event
//        bench-field.js first <event> <field>    -> field of the first entry (empty if none)
//        bench-field.js last <event> <field>     -> field of the last entry (empty if none)
const fs = require('node:fs');

const [mode, event, field] = process.argv.slice(2);
const entries = [];
for (const line of fs.readFileSync(0, 'utf8').split(/\r?\n/)) {
  const start = line.indexOf('{"event"');
  const end = line.lastIndexOf('}');
  if (start === -1 || end < start) continue;
  try {
    entries.push(JSON.parse(line.slice(start, end + 1)));
  } catch {
    // Not a complete JSON entry (wrapped line): ignored.
  }
}

const matches = entries.filter((e) => e.event === event);
if (mode === 'count') {
  console.log(matches.length);
} else {
  const hit = mode === 'last' ? matches.at(-1) : matches[0];
  console.log(hit && hit[field] !== undefined ? String(hit[field]) : '');
}
