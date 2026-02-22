import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // Run tests sequentially to avoid parallel login races and API saturation
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Give CI more time — cold container, production Next.js startup, DB seed
  timeout: process.env.CI ? 90_000 : 30_000,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3111',
    // Force English locale so i18next doesn't fall back to Arabic (fallbackLng)
    // in CI where headless Chromium has no system locale configured.
    locale: 'en-US',
    // Pre-accept cookie consent and force English language on every test page.
    // The 'connectin-lang' key is read by i18next-browser-languagedetector
    // before navigator.language, ensuring English labels in all tests.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: process.env.BASE_URL || 'http://localhost:3111',
          localStorage: [
            { name: 'connectin-cookie-consent', value: 'accepted' },
            { name: 'connectin-lang', value: 'en' },
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
