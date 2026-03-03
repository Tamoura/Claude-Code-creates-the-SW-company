/**
 * fixtures/index.ts — Custom Playwright fixtures for AI Fluency E2E tests
 *
 * Provides:
 *   - authedPage: a page fixture pre-authenticated as a fresh test user
 *   - testCredentials: the email/password of the current test user
 *
 * Usage:
 *   import { test, expect } from '../../fixtures/index.js';
 *
 *   test('[US-XX] authenticated user can see dashboard', async ({ authedPage }) => {
 *     await expect(authedPage).toHaveURL('/dashboard');
 *   });
 */

import { test as base, expect, Page } from '@playwright/test';
import { createTestUser, loginViaUI, TestUserCredentials } from '../helpers/auth.js';

type AiFluencyFixtures = {
  /** A Playwright Page that has been authenticated as a fresh test user. */
  authedPage: Page;
  /** Credentials of the authenticated test user (for API calls in tests). */
  testCredentials: TestUserCredentials;
};

export const test = base.extend<AiFluencyFixtures>({
  authedPage: async ({ page, request }, use) => {
    // Create a unique test user via the API
    const credentials = await createTestUser(request);

    // Log in via the UI to establish browser session (cookies, auth state)
    await loginViaUI(page, credentials.email, credentials.password);

    // Hand page to the test
    await use(page);
    // No teardown needed — test users are cleaned up by DB reset in CI
  },

  testCredentials: async ({ request }, use) => {
    const credentials = await createTestUser(request);
    await use(credentials);
  },
});

export { expect };
