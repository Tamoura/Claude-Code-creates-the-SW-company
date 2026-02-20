import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for LinkedIn Agent E2E tests
 *
 * Configuration notes:
 * - Single worker (sequential execution) to avoid rate-limit issues
 * - Auto-starts web dev server on port 3108
 * - Chromium only for faster test runs
 * - Retries: 2 in CI, 0 locally
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential execution
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3108',
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
    url: process.env.E2E_BASE_URL || 'http://localhost:3108',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for startup
  },
});
