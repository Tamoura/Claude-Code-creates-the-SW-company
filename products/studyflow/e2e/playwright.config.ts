import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for StudyFlow E2E.
 *
 * Non-negotiables (QA-01):
 * - Tests run against the REAL running stack (no mocks):
 *     web  http://localhost:3122   (Next.js, sage design)
 *     api  http://localhost:5017   (Fastify + Prisma)
 *     db   Postgres `studyflow_dev`
 *   Both servers are assumed ALREADY RUNNING. The webServer block below only
 *   *reuses* the existing server; it never starts a competing one in normal use.
 * - Specs are organised by story under tests/stories/{story-id}/.
 * - Each test creates its own fresh user via the signup UI (unique email per run).
 *
 * Artifacts (screenshots + traces) for the full-loop / failure analysis land in
 * ./e2e-proof and the HTML report in ./playwright-report.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './e2e-proof',
  // Sequential: every test mutates the shared `studyflow_dev` DB. Each test uses
  // its own fresh user, so cross-test data collisions are avoided, but running
  // serially keeps the run deterministic and easy to read.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3122',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The full-loop spec explicitly captures a success screenshot regardless.
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reuse the already-running web server. We do NOT start our own (the stack is
  // up); `reuseExistingServer: true` makes Playwright simply wait for / confirm
  // the URL is reachable.
  webServer: {
    command:
      "node -e \"console.log('studyflow web assumed already running on 3122')\"",
    url: process.env.E2E_BASE_URL || 'http://localhost:3122',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
