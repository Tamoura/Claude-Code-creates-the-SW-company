/**
 * helpers/auth.ts — Authentication helpers for E2E tests
 *
 * API-based helpers: register and login via the real backend API.
 * No mocks — all calls go to http://localhost:5014/api/v1/auth/*.
 *
 * Backend auth endpoints (from routes/index.ts planned registration):
 *   POST /api/v1/auth/register  → { token, user }
 *   POST /api/v1/auth/login     → { token, user }
 *   GET  /api/v1/auth/me        → { user }
 */

import { APIRequestContext, Page } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5014';

export interface TestUserCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Create a unique test user via the registration API.
 * Returns the credentials used so the caller can log in.
 */
export async function createTestUser(
  request: APIRequestContext
): Promise<TestUserCredentials> {
  const timestamp = Date.now();
  const credentials: TestUserCredentials = {
    email: `e2e-test-${timestamp}@example.com`,
    password: 'E2ETestPass123!',
    name: 'E2E Test User',
  };

  const registerRes = await request.post(`${API_BASE}/api/v1/auth/register`, {
    data: {
      email: credentials.email,
      password: credentials.password,
      name: credentials.name,
    },
  });

  if (!registerRes.ok()) {
    const body = await registerRes.text();
    throw new Error(
      `createTestUser failed — status ${registerRes.status()}: ${body}`
    );
  }

  return credentials;
}

/**
 * Log in via the API and return the auth response (token + user).
 * Sets the httpOnly refresh cookie automatically via the request context.
 */
export async function loginViaAPI(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `loginViaAPI failed — status ${res.status()}: ${body}`
    );
  }

  return res.json() as Promise<AuthResponse>;
}

/**
 * Log in via the UI login form.
 * Navigates to /login, fills the form, and waits for redirect to /dashboard.
 *
 * Use this when you need real browser state (cookies, localStorage) set.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for successful redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

/**
 * Create a fresh test user and log them in via UI.
 * Returns credentials for reference; page is authenticated on return.
 */
export async function createAndLoginUser(
  request: APIRequestContext,
  page: Page
): Promise<TestUserCredentials> {
  const credentials = await createTestUser(request);
  await loginViaUI(page, credentials.email, credentials.password);
  return credentials;
}
