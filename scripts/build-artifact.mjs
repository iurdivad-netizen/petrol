#!/usr/bin/env node
/**
 * Bundles the built site into a single self-contained HTML fragment suitable
 * for publishing as an Artifact, so the game can be played without cloning or
 * installing anything.
 *
 *   npm run build && node scripts/build-artifact.mjs
 *
 * Emits dist/artifact.html: the page content only, with CSS and JS inlined and
 * no doctype/html/head/body wrapper.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const assets = join('dist', 'assets');
const files = readdirSync(assets);

const css = files.filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');

if (!js) throw new Error('No JS bundle found — run npm run build first.');

const html = `<title>Petróleo Karto 1976</title>
<style>
${css}
</style>
<div id="app"></div>
<script type="module">
${js}
</script>
`;

writeFileSync(join('dist', 'artifact.html'), html);
console.log(`dist/artifact.html  ${(html.length / 1024).toFixed(1)} kB`);
