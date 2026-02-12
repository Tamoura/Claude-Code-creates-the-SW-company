import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for ConnectGRC E2E tests
 *
 * - Sequential execution to avoid race conditions
 * - Auto-starts web dev server on port 3110
 * - Chromium only for faster test runs
 * - Retries: 2 in CI, 0 locally
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3110',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cd ../apps/web && npm run dev',
    url: 'http://localhost:3110',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
