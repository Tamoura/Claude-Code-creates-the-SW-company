import { defineConfig, devices } from '@playwright/test';

/**
 * CONVENTION (`.claude/protocols/regression-testing.md`):
 *   Every feature adds a regression spec here. Specs are named for the
 *   requirement they cover — `FR-069-task-inbox.spec.ts` — so the traceability
 *   gate can find them.
 *
 * RTL: the `chromium-rtl` project runs the same specs with an Arabic locale
 * (DEC-001). A layout that only works LTR fails here, not in review.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3123',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @connectbpm/api dev',
      port: 5018,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @connectbpm/web dev',
      port: 3123,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium-rtl',
      use: { ...devices['Desktop Chrome'], locale: 'ar-QA' },
    },
    // NFR-003: single-task view interactive <= 2.0s on 4G / 375px.
    { name: 'mobile', use: { ...devices['iPhone 12'] } },
  ],
});
