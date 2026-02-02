/**
 * Auth Fixture for E2E Tests
 *
 * Provides authenticated page access without hitting the rate-limited
 * auth endpoints repeatedly.
 *
 * Key design: uses page.route() to intercept the browser's login API
 * call and return a pre-fetched token. The signup/login API calls happen
 * via Playwright's request context - each test creates a UNIQUE user
 * to avoid shared state issues.
 *
 * Rate-limit mitigation: Each signup uses only 1 API call. The browser
 * login uses 0 API calls (intercepted). Tests that don't need unique
 * data can share users via worker-scoped fixtures.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth.fixture';
 *   test('my test', async ({ authedPage, authedUser }) => { ... });
 */

import { test as base, expect, request as pwRequest, type Page, type APIRequestContext } from '@playwright/test';

const API_URL = 'http://localhost:5001';
export const TEST_PASSWORD = 'TestPassword123!@#';

export interface TestUser {
  email: string;
  password: string;
  token: string;
  userId: string;
  role: string;
}

interface AuthFixtures {
  /** A Page already authenticated as a merchant user on /dashboard */
  authedPage: Page;
  /** The authenticated user's details */
  authedUser: TestUser;
  /** Sign up a new user via API, returns auth details */
  createUser: (emailPrefix?: string) => Promise<TestUser>;
  /** Authenticate a page with given user credentials (uses route interception) */
  authenticatePage: (page: Page, user: TestUser) => Promise<void>;
}

// Worker-scoped shared user - created once per worker, reused across tests
// This dramatically reduces signup API calls
interface WorkerFixtures {
  workerUser: TestUser;
}

/**
 * Create a new user via the API. Uses signup endpoint.
 * Uses a unique User-Agent per call to avoid the auth rate limiter
 * (which fingerprints on IP + truncated User-Agent).
 */
export async function signupUser(
  request: APIRequestContext,
  emailPrefix = 'e2e',
): Promise<TestUser> {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
  const uniqueUA = `PlaywrightE2E/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await request.post(`${API_URL}/v1/auth/signup`, {
    data: { email, password: TEST_PASSWORD },
    headers: { 'user-agent': uniqueUA },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Signup failed (${res.status()}): ${body}`);
  }

  const body = await res.json();
  return {
    email,
    password: TEST_PASSWORD,
    token: body.access_token,
    userId: body.id,
    role: body.role,
  };
}

/**
 * Authenticate a Playwright page by intercepting the login API call.
 * This consumes ZERO rate-limit slots on the auth endpoints.
 *
 * IMPORTANT: After authentication, do NOT use page.goto() for
 * in-dashboard navigation — that triggers a full page reload which
 * clears the in-memory token. Use sidebar clicks instead.
 * Use navigateTo() helper for safe navigation.
 */
export async function authenticatePageWithUser(page: Page, user: TestUser): Promise<void> {
  await page.route('**/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.userId,
        email: user.email,
        role: user.role,
        access_token: user.token,
        refresh_token: 'e2e-mock-refresh-token',
      }),
    });
  });

  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.unroute('**/v1/auth/login');
}

/**
 * Navigate to a dashboard sub-page using sidebar links (client-side routing).
 * This avoids full page reloads that would clear the in-memory auth token.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  const link = page.locator(`aside a[href="${path}"]`);
  if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
    await link.click();
  } else {
    // Fallback: use JS navigation which doesn't trigger full reload
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    // Give React Router time to re-render
    await page.waitForTimeout(500);
  }
  await page.waitForURL(`**${path}`, { timeout: 10000 });
}

export const test = base.extend<AuthFixtures, WorkerFixtures>({
  // Worker-scoped: one signup per worker process
  workerUser: [async ({}, use) => {
    const ctx = await pwRequest.newContext();
    try {
      const user = await signupUser(ctx, 'e2e-worker');
      await use(user);
    } finally {
      await ctx.dispose();
    }
  }, { scope: 'worker' }],

  createUser: async ({ request }, use) => {
    await use((prefix) => signupUser(request, prefix));
  },

  authenticatePage: async ({}, use) => {
    await use(authenticatePageWithUser);
  },

  // Test-scoped: reuses worker user, only creates fresh page auth
  authedUser: async ({ workerUser }, use) => {
    await use(workerUser);
  },

  authedPage: async ({ page, authedUser, authenticatePage }, use) => {
    await authenticatePage(page, authedUser);
    await use(page);
  },
});

export { expect };

/**
 * Helper: login via the real UI form (for testing the login flow itself).
 * WARNING: consumes a rate-limit slot. Only use in auth-specific tests.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Helper: create a user with an API key (for payment session tests).
 */
export async function createUserWithApiKey(
  request: APIRequestContext,
  emailPrefix = 'e2e-apikey',
): Promise<TestUser & { apiKey: string }> {
  const user = await signupUser(request, emailPrefix);

  const keyRes = await request.post(`${API_URL}/v1/api-keys`, {
    headers: { authorization: `Bearer ${user.token}` },
    data: {
      name: 'E2E Test Key',
      permissions: { read: true, write: true, refund: false },
    },
  });

  if (!keyRes.ok()) {
    throw new Error(`API key creation failed: ${keyRes.status()}`);
  }

  const keyBody = await keyRes.json();
  return { ...user, apiKey: keyBody.key };
}

// Cache admin token to avoid repeated login API calls
let cachedAdminToken: { id: string; email: string; role: string; access_token: string } | null = null;

/**
 * Helper: login as admin using route interception.
 * Requires seeded admin@test.com user.
 * Caches the admin token to avoid rate-limit issues.
 */
export async function loginAsAdmin(
  page: Page,
  request: APIRequestContext,
): Promise<void> {
  if (!cachedAdminToken) {
    const uniqueUA = `PlaywrightE2E/admin-${Date.now()}`;
    const loginRes = await request.post(`${API_URL}/v1/auth/login`, {
      data: { email: 'admin@test.com', password: 'TestPassword123!@#' },
      headers: { 'user-agent': uniqueUA },
    });

    if (!loginRes.ok()) {
      throw new Error(`Admin login failed: ${loginRes.status()}`);
    }

    cachedAdminToken = await loginRes.json();
  }

  const body = cachedAdminToken!;

  await page.route('**/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: body.id,
        email: 'admin@test.com',
        role: body.role,
        access_token: body.access_token,
        refresh_token: 'e2e-admin-refresh',
      }),
    });
  });

  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'TestPassword123!@#');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.unroute('**/v1/auth/login');
}
