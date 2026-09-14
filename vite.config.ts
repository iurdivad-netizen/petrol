import { defineConfig } from 'vite';

// base '' keeps asset URLs relative so the build works from any static host,
// including a GitHub Pages project subpath.
export default defineConfig({
  base: '',
  build: { outDir: 'dist', target: 'es2022' },
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
