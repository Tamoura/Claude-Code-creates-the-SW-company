import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/auth.page';

test.describe('Register', () => {
  test('shows register form', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    // Heading is "Join ConnectIn" (EN) | "انضم إلى كونكت إن" (AR)
    await expect(page.getByRole('heading', { name: /Join ConnectIn|انضم/i })).toBeVisible();
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
    // After register, the server sends a verification email.
    // The page should show a "check your email" confirmation screen.
    await expect(
      page.getByRole('heading', { name: /check your email/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('validates duplicate email — shows verification prompt', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    // The API returns a successful 200 for duplicate emails to prevent
    // user enumeration — both new and existing emails show the same
    // "check your email" prompt (no error is revealed).
    await registerPage.register('Test User', 'user1@connectin.dev', 'Test1234!');
    await expect(
      page.getByRole('heading', { name: /check your email/i })
    ).toBeVisible({ timeout: 8_000 });
  });

  test('link to login page works', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    // "Log In" (EN) | "تسجيل الدخول" (AR)
    await page.getByRole('link', { name: /Log In|تسجيل الدخول/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
