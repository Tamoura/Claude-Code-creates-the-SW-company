import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';

test.describe('Authentication Flows', () => {

  test('landing page shows Sign In and Get Started buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Get Started' })).toBeVisible();
  });

  test('Sign In button navigates to login page', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: 'Sign In' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('Get Started button navigates to signup page', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: 'Get Started' }).click();
    await expect(page).toHaveURL('/signup');
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
    const email = `e2e-auth-${Date.now()}@test.com`;
    const password = 'TestPassword123!@#';

    // Step 1: Signup via API (to avoid UI flakiness)
    await request.post(`${API_URL}/v1/auth/signup`, {
      data: { email, password },
    });

    // Step 2: Login via UI
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Step 3: Should be on dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');

    // Step 4: Verify dashboard content loaded
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Step 5: Sign out via user dropdown
    const avatar = page.locator('header button.rounded-full');
    await avatar.click();
    await page.locator('button', { hasText: 'Sign Out' }).click();

    // Step 6: Should be on login page
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated user redirected from dashboard to login', async ({ page }) => {
    // Try to visit dashboard without being logged in
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('login with wrong password shows error', async ({ page, request }) => {
    const email = `e2e-wrong-${Date.now()}@test.com`;
    const password = 'TestPassword123!@#';

    // Create user
    await request.post(`${API_URL}/v1/auth/signup`, {
      data: { email, password },
    });

    // Try login with wrong password
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Should show error and stay on login page
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('login page has link to signup page', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL('/signup');
  });

  test('signup page has link to login page', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });
});
