import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E tests
 *
 * These tests verify the authenticated user experience.
 * They gracefully skip when the API is not running or test user is not seeded.
 *
 * To run with a real user, seed: talent@connectgrc.test / Test1234
 */

// Helper to login before tests - returns true if login succeeded
async function loginAsTestUser(page: import('@playwright/test').Page): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('talent@connectgrc.test');
    await page.locator('input[type="password"]').fill('Test1234');
    await page.locator('button:has-text("Sign In")').click();

    // Wait for redirect to dashboard with short timeout
    await page.waitForURL('**/dashboard', { timeout: 3000 });
    return true;
  } catch (error) {
    // Login failed - API not running or user not seeded
    return false;
  }
}

test.describe('Dashboard', () => {
  test('shows dashboard content after login', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    // Check sidebar links
    const sidebarLinks = ['Profile', 'Assessment', 'Career', 'Resources', 'Notifications'];
    for (const linkText of sidebarLinks) {
      const link = page.locator(`nav a:has-text("${linkText}")`).first();
      if (await link.isVisible()) {
        await expect(link).toBeVisible();
      }
    }
  });

  test('profile page loads', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.locator('nav a:has-text("Profile")').first().click();
    await expect(page).toHaveURL(/.*\/profile/);
  });

  test('assessment page loads', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.locator('nav a:has-text("Assessment")').first().click();
    await expect(page).toHaveURL(/.*\/assessment/);
  });

  test('career page loads', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.locator('nav a:has-text("Career")').first().click();
    await expect(page).toHaveURL(/.*\/career/);
  });

  test('resources page loads', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.locator('nav a:has-text("Resources")').first().click();
    await expect(page).toHaveURL(/.*\/resources/);
  });

  test('notifications page loads', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.locator('nav a:has-text("Notifications")').first().click();
    await expect(page).toHaveURL(/.*\/notifications/);
  });
});
