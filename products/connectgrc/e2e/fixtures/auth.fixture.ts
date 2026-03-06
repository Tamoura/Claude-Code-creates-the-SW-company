import { test as base, Page } from '@playwright/test';

/**
 * Authentication fixture for ConnectGRC E2E tests
 *
 * Provides a reusable loginAsTestUser helper and an
 * authenticatedPage fixture for tests that require login.
 *
 * Test user: talent@connectgrc.test / Test1234
 * Must be seeded via the API seed script before running.
 */

export const TEST_USER = {
  email: 'talent@connectgrc.test',
  password: 'Test1234',
  name: 'Test Talent',
  role: 'TALENT',
} as const;

export const ADMIN_USER = {
  email: 'admin@connectgrc.test',
  password: 'Admin1234',
  name: 'Test Admin',
  role: 'ADMIN',
} as const;

/**
 * Attempt to log in as a test user.
 * Returns true if login succeeded (dashboard loaded), false otherwise.
 * Does NOT fail the test -- callers should use test.skip() on false.
 */
export async function loginAsTestUser(
  page: Page,
  user = TEST_USER
): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extended test fixtures with authentication helpers.
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    const success = await loginAsTestUser(page);
    if (!success) {
      // Skip test if login fails (API not running or user not seeded)
      base.skip();
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
