import { test, expect } from '@playwright/test';
import { signupUser, authenticatePageWithUser } from './fixtures/auth.fixture';

const API_URL = 'http://localhost:5001';

test.describe('Authentication Flows', () => {

  test('landing page shows Sign In and Get Started buttons', async ({ page }) => {
    await page.goto('/');

    // Nav links render as <a> tags (React Router <Link>), not <button>
    await expect(page.locator('a', { hasText: 'Sign In' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Get Started' })).toBeVisible();
  });

  test('Sign In button navigates to login page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a', { hasText: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Get Started button navigates to signup page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a', { hasText: 'Get Started' }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('signup page has email, password, and confirm password fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirm-password"]')).toBeVisible();
  });

  test('full signup -> login -> dashboard -> logout flow', async ({ page, request }) => {
    // Signup via API (1 rate-limit slot)
    const user = await signupUser(request, 'e2e-auth');

    // Login via UI with route interception (0 rate-limit slots)
    await authenticatePageWithUser(page, user);

    // Verify dashboard content loaded
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Sign out via user dropdown
    const avatar = page.locator('header button.rounded-full');
    await avatar.click();
    await page.locator('button', { hasText: 'Sign Out' }).click();

    // Should be on login page
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    // Intercept login to return 401 (no real API call needed)
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 401,
          title: 'Unauthorized',
          detail: 'Invalid email or password',
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has link to signup page', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('signup page has link to login page', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
