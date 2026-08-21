import { defineConfig, devices } from '@playwright/test';

/**
 * The Browser-First Gate (Article X) runs this suite against a real browser
 * before any feature is called done. Start the API and web app first, or let
 * `webServer` start the web app for you.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? {
        command: 'pnpm --filter @taskflow/web start',
        url: process.env.WEB_URL || 'http://localhost:3100',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
