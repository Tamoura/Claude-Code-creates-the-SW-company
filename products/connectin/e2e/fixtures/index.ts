import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

export const USER_EMAIL = 'user1@connectin.dev';
export const USER_PASSWORD = 'Test1234!';
export const API_URL = process.env.API_URL || 'http://localhost:5007';

/**
 * Helper used by individual auth tests (login page, register page) that need
 * to start unauthenticated and go through the login flow manually.
 *
 * For most authenticated tests use the `authenticatedPage` fixture instead —
 * it reuses the pre-saved auth state from globalSetup (no login per test).
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  // Wait for React hydration — Next.js App Router injects inline RSC scripts
  // that require 'unsafe-inline' in CSP (now set for both dev and production).
  // networkidle is sufficient once CSP allows these scripts to run.
  await page.waitForLoadState('networkidle');
  // Use stable ID selectors: SSR renders Arabic (fallbackLng: 'ar') which
  // fails /email/i matching. The inputs have deterministic IDs.
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(feed|dashboard|home|profile|network|jobs)/, { timeout: 30_000 });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * `authenticatedPage` fixture: provides a page authenticated as
 * user1@connectin.dev by performing a fresh UI login for each test.
 *
 * A fresh login is used instead of relying on the storageState refreshToken
 * because the refresh endpoint rotates the token on every use. If multiple
 * tests load the same auth-state.json and each triggers a refresh, the first
 * test rotates the token and all subsequent tests get "invalid refresh token".
 *
 * The login endpoint rate limit is set to max:100 in dev/test mode so running
 * the full suite (16+ tests) will not hit the limit.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

export { expect } from '@playwright/test';
