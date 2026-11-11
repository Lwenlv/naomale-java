import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/media': 'http://127.0.0.1:3000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
