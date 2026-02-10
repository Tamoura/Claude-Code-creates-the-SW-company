import { test as base, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:5003/api/v1';

/**
 * Credentials for a test user created fresh per test worker.
 * Each worker gets a unique email to avoid conflicts.
 */
interface TestUser {
  email: string;
  password: string;
  name: string;
  token: string;
  id: string;
}

/**
 * Registers a new user via the API and returns credentials + JWT.
 * Uses the worker index to generate unique emails so parallel
 * workers never collide.
 */
async function createTestUser(workerIndex: number): Promise<TestUser> {
  const timestamp = Date.now();
  const email = `e2e-worker${workerIndex}-${timestamp}@test.pulse.dev`;
  const password = 'TestPassword123!@#';
  const name = `E2E Test User ${workerIndex}`;

  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to register test user (${response.status}): ${body}`
    );
  }

  const data = await response.json();

  return {
    email,
    password,
    name,
    token: data.token,
    id: data.user.id,
  };
}

/**
 * Logs in an existing user via the API and returns a fresh JWT.
 */
async function loginTestUser(
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to login test user (${response.status}): ${body}`
    );
  }

  const data = await response.json();
  return data.token;
}

/**
 * Injects a JWT token into the browser so subsequent navigations
 * are treated as authenticated. Sets the token in localStorage
 * under the key the frontend expects.
 */
async function injectAuth(page: Page, token: string): Promise<void> {
  // Navigate to the app first so we can access localStorage
  await page.goto('/');
  await page.evaluate((t: string) => {
    localStorage.setItem('pulse_token', t);
  }, token);
}

// ── Extended test fixtures ──────────────────────────────────────

type AuthFixtures = {
  /** A test user registered via the API for this worker */
  testUser: TestUser;
  /** A Page instance already authenticated as testUser */
  authedPage: Page;
};

/**
 * Extends the base Playwright test with auth-aware fixtures.
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures/auth';
 *   test('dashboard loads', async ({ authedPage }) => { ... });
 */
export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use, workerInfo) => {
    const user = await createTestUser(workerInfo.workerIndex);
    await use(user);
  },

  authedPage: async ({ page, testUser }, use) => {
    await injectAuth(page, testUser.token);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { createTestUser, loginTestUser, injectAuth };
export type { TestUser };
