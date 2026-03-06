import { test, expect } from '@playwright/test';
import {
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  APP_ROUTES,
  ADMIN_ROUTES,
} from '../../fixtures/test-data';
import { BasePage } from '../../pages/BasePage';

/**
 * Smoke tests: verify every route loads without errors.
 *
 * These tests do NOT require a running API or seeded data.
 * They validate that Next.js serves each page and that no route
 * results in an unhandled error or blank screen.
 */

test.describe('Smoke: Public Routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) loads`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(route.path);

      // Page should have content (not blank)
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();

      // Should have at least one heading
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 10000 });

      // Check for placeholder pages (CRITICAL check)
      const basePage = new BasePage(page);
      await basePage.expectNoPlaceholders();
    });
  }
});

test.describe('Smoke: Auth Routes', () => {
  test('Login page (/login) loads with form [FR-AUTH-05]', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('Register page (/register) loads with form [FR-AUTH-01]', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('select#role')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Forgot Password page (/forgot-password) loads [FR-AUTH-08]', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('text=Forgot Password')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Reset Password page (/reset-password) loads', async ({ page }) => {
    await page.goto('/reset-password?token=test-token');
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Verify Email page (/verify-email) loads', async ({ page }) => {
    await page.goto('/verify-email?token=test-token');
    // Should show verification status or instructions
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});

test.describe('Smoke: App Routes (unauthenticated)', () => {
  for (const route of APP_ROUTES) {
    test(`${route.name} (${route.path}) loads or redirects`, async ({ page }) => {
      await page.goto(route.path);
      // Either the page loads (no auth guard yet) or redirects to /login
      const url = page.url();
      expect(url).toMatch(new RegExp(`(${route.path.replace('/', '\\/')}|login)`));

      // Should not be blank
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

test.describe('Smoke: Admin Routes (unauthenticated)', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route.name} (${route.path}) loads or redirects`, async ({ page }) => {
      await page.goto(route.path);
      // Should redirect to login or show forbidden
      const url = page.url();
      expect(url).toMatch(new RegExp(`(${route.path.replace(/\//g, '\\/')}|login|forbidden)`));

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

test.describe('Smoke: Error Handling', () => {
  test('404 page shows for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');
    // Next.js returns 404 for unknown routes
    if (response) {
      expect(response.status()).toBe(404);
    }
  });
});
