/**
 * helpers/auth.ts — Authentication helpers for E2E tests
 *
 * Backend auth endpoints:
 *   POST /api/v1/auth/register  → { token, user }
 *   POST /api/v1/auth/login     → { token, user }
 *   GET  /api/v1/auth/me        → { user }
 */

import { APIRequestContext, Page } from '@playwright/test';

export const API_BASE = process.env.API_BASE_URL || 'http://localhost:5014';
export const DEFAULT_ORG_SLUG = 'demo-org';
export const DEFAULT_ORG_ID = ''; // Not needed — we use slug

export interface TestUserCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgSlug: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Create a unique test user via the registration API.
 * Returns both credentials and auth result (token + user).
 */
export async function createTestUser(
  request: APIRequestContext,
  overrides?: Partial<{ email: string; firstName: string; lastName: string; orgSlug: string }>,
): Promise<{ credentials: TestUserCredentials; auth: AuthResult }> {
  const timestamp = Date.now();
  const credentials: TestUserCredentials = {
    email: overrides?.email ?? `e2e-test-${timestamp}@example.com`,
    password: 'E2ETestPass123!',
    firstName: overrides?.firstName ?? 'E2E',
    lastName: overrides?.lastName ?? 'TestUser',
    orgSlug: overrides?.orgSlug ?? DEFAULT_ORG_SLUG,
  };

  const registerRes = await request.post(`${API_BASE}/api/v1/auth/register`, {
    data: {
      email: credentials.email,
      password: credentials.password,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      orgSlug: credentials.orgSlug,
    },
  });

  if (!registerRes.ok()) {
    const body = await registerRes.text();
    throw new Error(
      `createTestUser failed — status ${registerRes.status()}: ${body}`,
    );
  }

  const data = (await registerRes.json()) as { token: string; user: AuthResult['user'] };

  return {
    credentials,
    auth: {
      accessToken: data.token,
      refreshToken: data.token, // Same token for MVP (no refresh flow yet)
      user: data.user,
    },
  };
}

/**
 * Log in via the API and return the auth result.
 */
export async function loginViaAPI(
  request: APIRequestContext,
  email: string,
  password: string,
  orgSlug: string = DEFAULT_ORG_SLUG,
): Promise<AuthResult> {
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password, orgSlug },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `loginViaAPI failed — status ${res.status()}: ${body}`,
    );
  }

  const data = (await res.json()) as { token: string; user: AuthResult['user'] };
  return {
    accessToken: data.token,
    refreshToken: data.token,
    user: data.user,
  };
}

/**
 * Log in via the UI login form.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

/**
 * Inject auth token into browser localStorage so the frontend
 * recognizes the user as authenticated.
 */
export async function injectAuthTokens(
  page: Page,
  accessToken: string,
  _refreshToken?: string,
): Promise<void> {
  await page.evaluate((token) => {
    localStorage.setItem('ai_fluency_token', token);
  }, accessToken);
}

/**
 * Create a fresh test user and log them in via UI.
 */
export async function createAndLoginUser(
  request: APIRequestContext,
  page: Page,
): Promise<{ credentials: TestUserCredentials; auth: AuthResult }> {
  const result = await createTestUser(request);
  await loginViaUI(page, result.credentials.email, result.credentials.password);
  return result;
}
