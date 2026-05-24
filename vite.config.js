import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
  },
  server: {
    port: 8080,
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        // MediaPipe vendor scripts are loaded as non-module <script> tags.
        // Vite doesn't bundle them, so we copy them to dist/ manually.
        cpSync('vendor', 'dist/vendor', { recursive: true });
        cpSync('fahhhhh.mp3', 'dist/fahhhhh.mp3');
        cpSync('service-worker.js', 'dist/service-worker.js');
      },
    },
  ],
});