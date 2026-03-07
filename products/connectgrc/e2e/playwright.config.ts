import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for ConnectGRC E2E tests
 *
 * - Sequential execution to avoid race conditions
 * - Auto-starts web dev server on port 3110
 * - Chromium only for faster local runs; multi-browser in CI
 * - Retries: 2 in CI, 0 locally
 * - Screenshots on failure for debugging
 * - 120s webServer timeout (learned pattern PATTERN-004)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3110',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env.CI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'cd ../apps/web && npm run dev',
    url: 'http://localhost:3110',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
