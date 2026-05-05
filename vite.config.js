import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'mediapipe': ['@mediapipe/face_mesh', '@mediapipe/camera_utils'],
        },
      },
    },
    sourcemap: false,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['@mediapipe/face_mesh', '@mediapipe/camera_utils'],
  },
  server: {
    port: 8080,
    open: true,
  },
});