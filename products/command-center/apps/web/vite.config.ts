import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3113,
    proxy: {
      '/api': {
        target: 'http://localhost:5009',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react-markdown',
      'remark-gfm',
      'rehype-raw',
      'mermaid',
    ],
  },
});
