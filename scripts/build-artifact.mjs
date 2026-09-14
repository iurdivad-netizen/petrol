#!/usr/bin/env node
/**
 * Bundles the built site into a single self-contained HTML fragment suitable
 * for publishing as an Artifact, so the game can be played without cloning or
 * installing anything.
 *
 *   npm run build && node scripts/build-artifact.mjs
 *
 * Emits:
 *   index.html, play.html            — at the repository root
 *   dist/index.html, dist/play.html  — in the deployed bundle
 *   dist/artifact.html               — fragment for publishing as an Artifact
 *
 * The root index.html is a COMMITTED BUILD, deliberately. GitHub Pages serving
 * a branch root would otherwise hand the browser dev.html's TypeScript entry,
 * which no browser can execute. Writing the built page to index.html makes the
 * site work at its root URL under either Pages source mode. play.html is kept
 * as an alias for links already shared.
 *
 * Regenerate with `npm run build:artifact` after any change under src/.
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

// Written to both locations so the same URL works whichever Pages source is
// active: the repository root for a branch-served site, and dist/ for the
// GitHub Actions deployment.
for (const target of ['index.html', 'play.html', join('dist', 'index.html'), join('dist', 'play.html')]) {
  writeFileSync(target, standalone);
}
console.log(`index.html          ${(standalone.length / 1024).toFixed(1)} kB  (also play.html, dist/index.html, dist/play.html)`);
