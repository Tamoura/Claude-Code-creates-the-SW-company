import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();

    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });

    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
  });

  test('unauthenticated user accessing dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email').isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });
});
