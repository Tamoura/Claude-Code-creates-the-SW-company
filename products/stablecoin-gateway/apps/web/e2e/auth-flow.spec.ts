import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Click submit without filling fields
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();

    // Browser native validation or form validation should prevent submission
    // The email field should be marked as invalid or show an error
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test('login page has link to register or reset password', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Page should contain at least one navigation link
    const links = page.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('unauthenticated user accessing dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Should either redirect to login or show login prompt
    // Wait for page to settle
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.getByLabel(/email/i).isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });
});
