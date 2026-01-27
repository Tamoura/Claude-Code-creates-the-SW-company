import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
