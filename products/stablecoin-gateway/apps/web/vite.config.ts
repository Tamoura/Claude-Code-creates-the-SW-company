import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    server: {
      port: 3104, // See .claude/PORT-REGISTRY.md
    },
    define: {
      // Ensure VITE_USE_MOCK defaults to 'false' if not set
      'import.meta.env.VITE_USE_MOCK': JSON.stringify(
        process.env.VITE_USE_MOCK || 'false'
      ),
    },
    build: {
      // Enable minification and tree-shaking for production
      minify: isProduction ? 'esbuild' : false,
      rollupOptions: {
        output: {
          // Ensure consistent chunk naming for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
    esbuild: {
      // Drop console.error warnings in production (optional, can be removed)
      // Keeping them for security visibility
      // drop: isProduction ? ['console'] : [],
    },
  };
});
