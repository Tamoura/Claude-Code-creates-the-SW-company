import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3111,
    proxy: {
      '/api': {
        target: 'http://localhost:5007',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5007',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
});
