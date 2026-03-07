/**
 * playwright.config.ts — AI Fluency E2E test configuration
 *
 * Sequential execution (workers: 1) to avoid DB conflicts during foundation.
 * No webServer config — backend (port 5014) and frontend (port 3118) must be
 * running before tests execute.
 *
 * To run:
 *   1. Start API:  cd ../apps/api && npm run dev
 *   2. Start Web:  cd ../apps/web && npm run dev
 *   3. Run tests:  npm test
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Sequential to avoid DB conflicts in foundation phase
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3118',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer block — servers must be running before tests start.
  // Run: cd apps/api && npm run dev  (port 5014)
  //      cd apps/web && npm run dev  (port 3118)
});
