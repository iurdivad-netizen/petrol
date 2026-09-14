#!/usr/bin/env node
/**
 * Bundles the built site into a single self-contained HTML fragment suitable
 * for publishing as an Artifact, so the game can be played without cloning or
 * installing anything.
 *
 *   npm run build && node scripts/build-artifact.mjs
 *
 * Emits two files:
 *   dist/artifact.html — page content only, no doctype/html/head/body wrapper,
 *                        for publishing as an Artifact.
 *   play.html          — a complete standalone document at the repository root.
 *
 * play.html is committed deliberately. GitHub Pages on this repository serves
 * the branch root, where index.html is the Vite dev entry and loads TypeScript
 * a browser cannot execute. Committing the built page means the Pages site
 * works with no repository setting to change. Regenerate with
 * `npm run build:artifact` after any change to src/.
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

const standalone = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Recriação jogável de PETRÓLEO, o jogo de tabuleiro da Karto de 1976.">
<meta name="theme-color" content="#20303d">
${html}</body>
</html>
`.replace('<div id="app"></div>', '</head>\n<body>\n<div id="app"></div>');

writeFileSync('play.html', standalone);
console.log(`play.html           ${(standalone.length / 1024).toFixed(1)} kB`);
