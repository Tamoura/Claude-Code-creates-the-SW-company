import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Enable mock mode for tests
    'import.meta.env.VITE_USE_MOCK': JSON.stringify('true'),
    'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('true'),
    'import.meta.env.DEV': JSON.stringify(true),
    'import.meta.env.PROD': JSON.stringify(false),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/*.spec.ts',
    ],
  },
})
