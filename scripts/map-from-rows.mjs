#!/usr/bin/env node
/**
 * Turns a hand-read map grid into the MAP_LAYOUT block for src/data/board.ts.
 *
 * The board's prospecting grid can only be read off the physical component, so
 * this exists to make that reading mechanical: paste the rows in, get validated
 * layout strings out, with every likely transcription slip caught rather than
 * silently baked into the game.
 *
 *   node scripts/map-from-rows.mjs rows.txt
 *   cat rows.txt | node scripts/map-from-rows.mjs
 *
 * Spaces are treated as visual separators and stripped. Blank lines ignored.
 *
 * Legend: L land · S sea · P porto · I zona industrial · X card panel ·
 *         . no grid square · ? unread
 */

import { readFileSync } from 'node:fs';

const LEGEND = {
  L: 'land prospecting',
  S: 'sea prospecting',
  P: 'porto',
  I: 'zona industrial',
  X: 'card panel',
  '.': 'no grid square',
  '?': 'unread',
};

const EXPECTED_COLUMNS = 15;
const EXPECTED_ROWS = 10;

const source = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : readFileSync(0, 'utf8');

const rows = source
  .split('\n')
  .map((line) => line.replace(/\s+/g, ''))
  .filter((line) => line.length > 0);

const problems = [];

// 1. Unknown characters.
rows.forEach((row, r) => {
  [...row].forEach((ch, c) => {
    if (!(ch in LEGEND)) problems.push(`row ${r}, column ${c}: unknown character "${ch}"`);
  });
});

// 2. Ragged rows — by far the most likely slip.
const widths = [...new Set(rows.map((r) => r.length))];
if (widths.length !== 1) {
  problems.push(`rows are not all the same width: ${widths.sort((a, b) => a - b).join(', ')}`);
  rows.forEach((row, r) => {
    if (row.length !== EXPECTED_COLUMNS) {
      problems.push(`  row ${r} has ${row.length} cells, expected ${EXPECTED_COLUMNS}`);
    }
  });
}

// 3. Dimensions against what the board is known to be.
if (widths[0] !== undefined && widths[0] !== EXPECTED_COLUMNS) {
  problems.push(`width is ${widths[0]}, expected ${EXPECTED_COLUMNS}`);
}
if (rows.length !== EXPECTED_ROWS) {
  problems.push(`got ${rows.length} rows, expected ${EXPECTED_ROWS}`);
}

// 4. Region sanity — these mirror the assertions in tests/rules.test.ts.
const counts = {};
for (const row of rows) for (const ch of row) counts[ch] = (counts[ch] ?? 0) + 1;

const prospecting = (counts.L ?? 0) + (counts.S ?? 0);
if (prospecting < 28) {
  problems.push(`only ${prospecting} prospecting squares — the box holds 28 towers alone`);
}
for (const [ch, label] of [['P', 'porto'], ['X', 'card panel']]) {
  if (!counts[ch]) problems.push(`no ${label} cells found — the board has one`);
}
if (!counts.I) {
  problems.push('no zona industrial cells found — trucks need somewhere to go');
}
if (counts['?']) {
  problems.push(`${counts['?']} cell(s) marked unread — resolve before setting MAP.verified`);
}

// ---------------------------------------------------------------- report

const ruler = '   ' + Array.from({ length: widths[0] ?? 0 }, (_, i) => i % 10).join('');
console.log('\nParsed grid:\n');
console.log(ruler);
rows.forEach((row, r) => console.log(String(r).padStart(2) + ' ' + row));

console.log('\nCell counts:');
for (const [ch, n] of Object.entries(counts).sort()) {
  console.log(`  ${ch}  ${String(n).padStart(3)}  ${LEGEND[ch] ?? 'unknown'}`);
}
console.log(`  ${' '}  ${String(prospecting).padStart(3)}  prospecting total (licensable)`);

if (problems.length > 0) {
  console.log('\nPROBLEMS:\n');
  for (const p of problems) console.log('  - ' + p);
  console.log('\nFix these before pasting into src/data/board.ts.\n');
  process.exit(1);
}

console.log('\nAll checks passed. MAP_LAYOUT block for src/data/board.ts:\n');
console.log('const MAP_LAYOUT = [');
for (const row of rows) console.log(`  '${row}',`);
console.log('] as const;\n');
