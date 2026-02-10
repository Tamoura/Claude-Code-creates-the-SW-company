import { test, expect } from '@playwright/test';

/**
 * Smoke tests verify that every page in the application loads
 * without throwing errors and renders expected content.
 *
 * These tests do NOT require authentication -- they only verify
 * that the pages are reachable and render basic HTML.  Authed
 * pages may redirect to login, which is also an acceptable
 * response for a smoke test.
 */

test.describe('Public pages smoke tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/pulse/i);
    // The landing page should contain the app name
    await expect(page.getByText(/pulse/i).first()).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: /welcome back/i })
    ).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    // Page should render without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).not.toBeEmpty();
    // Should contain pricing-related content
    await expect(page.getByText(/free|pro|team|enterprise/i).first()).toBeVisible();
  });

  test('docs page loads', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Dashboard pages smoke tests (unauthenticated)', () => {
  // Dashboard pages may redirect to login if auth middleware
  // is active. We verify either the page loads or a redirect
  // to login occurs -- both are valid smoke test outcomes.

  const dashboardRoutes = [
    '/dashboard',
    '/dashboard/activity',
    '/dashboard/velocity',
    '/dashboard/quality',
    '/dashboard/repos',
    '/dashboard/risk',
    '/dashboard/risk/history',
    '/dashboard/team',
    '/dashboard/overview',
    '/dashboard/settings',
    '/dashboard/settings/notifications',
    '/dashboard/settings/team',
  ];

  for (const route of dashboardRoutes) {
    test(`${route} responds without error`, async ({ page }) => {
      const response = await page.goto(route);
      // The page should return a successful HTTP status
      // (200 for direct render, or 200 after redirect to login)
      expect(response?.status()).toBeLessThan(500);
      // Body should have content
      await expect(page.locator('body')).not.toBeEmpty();
    });
  }
});

test.describe('API health smoke test', () => {
  test('API health endpoint responds', async ({ request }) => {
    const response = await request.get(
      'http://localhost:5003/api/v1/health'
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});
