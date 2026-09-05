/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  // Served from the root of the custom domain (holdem-timer.com), so
  // assets always resolve from "/" regardless of build target.
  base: '/',
  plugins: [
    react(),
    // Generates dist/stats.html to inspect bundle composition and verify
    // tree-shaking. Only runs when ANALYZE=true (see the "build:analyze" script).
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  build: {
    // Vite/Rolldown tree-shakes and minifies by default; sourcemaps are
    // disabled to keep the production bundle as small as possible.
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
  },
});
