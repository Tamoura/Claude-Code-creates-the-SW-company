/**
 * Playwright configuration — Composable Credit OS E2E suite.
 *
 * Targets the web app on :3121 across chromium, firefox, and webkit
 * (Article III — E2E). Phase 0 has no spec files yet; `playwright test`
 * exits 0 with "0 tests". Specs land per phase under `tests/`.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3121',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
