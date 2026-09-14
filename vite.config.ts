import { defineConfig } from 'vite';

// base '' keeps asset URLs relative so the build works from any static host,
// including a GitHub Pages project subpath.
export default defineConfig({
  base: '',
  // dev.html is the entry: the repository's index.html is the committed build,
  // so that GitHub Pages serving the branch root gets a page that actually runs.
  server: { open: '/dev.html' },
  build: {
    outDir: 'dist',
    target: 'es2022',
    rollupOptions: { input: 'dev.html' },
  },
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
