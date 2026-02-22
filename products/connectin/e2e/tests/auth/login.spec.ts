import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth.page';

const VALID_EMAIL = 'user1@connectin.dev';
const VALID_PASSWORD = 'Test1234!';

test.describe('Login', () => {
  test('shows login form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Use stable ID selectors: the page is bilingual (AR/EN) and SSR may
    // render Arabic labels, so getByLabel(/email/i) is unreliable in CI.
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('redirects to feed on successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, 'wrongpassword');
    await loginPage.expectError();
  });

  test('validates empty email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('', VALID_PASSWORD);
    // Filter out Next.js route announcer (also role="alert" but always empty)
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible();
  });

  test('validates empty password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, '');
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible();
  });

  test('link to register page works', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // "Register" (EN) | "إنشاء حساب" (AR)
    await page.getByRole('link', { name: /^Register$|إنشاء حساب/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
