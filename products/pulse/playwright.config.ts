import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Pulse E2E tests.
 *
 * Runs against the Next.js frontend (port 3106) backed by
 * the Fastify API (port 5003). Both servers are started
 * automatically via the webServer array when tests launch.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3106',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd apps/api && npm run dev',
      port: 5003,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
      },
    },
    {
      command: 'cd apps/web && npm run dev',
      port: 3106,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
