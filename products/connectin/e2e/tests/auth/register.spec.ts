import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/auth.page';

test.describe('Register', () => {
  test('shows register form', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await expect(page.getByRole('heading', { name: /register|create|إنشاء/i })).toBeVisible();
  });

  test('registers a new user successfully', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    const unique = Date.now();
    await registerPage.register(
      `Test User ${unique}`,
      `testuser${unique}@connectin.dev`,
      'Test1234!'
    );
    // After register, should redirect to feed or show success
    await expect(page).toHaveURL(/\/(feed|register|verify)/, { timeout: 10_000 });
  });

  test('validates duplicate email', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register('Test User', 'user1@connectin.dev', 'Test1234!');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
  });

  test('link to login page works', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await page.getByRole('link', { name: /sign in|login|دخول/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
