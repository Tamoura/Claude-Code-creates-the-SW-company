import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  // RISK-067: Prevent mock mode from being deployed to production.
  // A production build with mock API enabled would bypass all real
  // payment processing and return fake data to users.
  if (isProduction && process.env.VITE_USE_MOCK_API === 'true') {
    throw new Error(
      'FATAL: VITE_USE_MOCK_API=true is not allowed in production builds. ' +
      'Unset VITE_USE_MOCK_API or set it to "false" before building for production.',
    );
  }

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
      // RISK-069: Disable source maps in production to prevent
      // exposing original source code to end users.
      sourcemap: !isProduction,
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
