import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // Run tests sequentially to avoid parallel login races and API saturation
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3111',
    // Pre-accept the cookie consent banner so it never blocks test clicks.
    // Authenticated tests call loginAs() which overwrites the page session with
    // a fresh login — the consent key persists because it is in localStorage,
    // not in auth cookies, so it survives the navigation.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: process.env.BASE_URL || 'http://localhost:3111',
          localStorage: [
            { name: 'connectin-cookie-consent', value: 'accepted' },
          ],
        },
      ],
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // No webServer — tests assume both services are already running
});
