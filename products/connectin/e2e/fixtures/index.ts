import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

const USER_EMAIL = 'user1@connectin.dev';
const USER_PASSWORD = 'Test1234!';

/**
 * Helper: log in via the UI and return the page.
 */
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login|دخول/i }).click();
  // Wait for redirect to feed or dashboard
  await page.waitForURL(/\/(feed|dashboard|home)/, { timeout: 10_000 });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { USER_EMAIL, USER_PASSWORD };
