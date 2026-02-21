import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth.page';

const VALID_EMAIL = 'user1@connectin.dev';
const VALID_PASSWORD = 'Test1234!';

test.describe('Login', () => {
  test('shows login form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login|دخول/i })).toBeVisible();
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
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('validates empty password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, '');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('link to register page works', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.getByRole('link', { name: /register|sign up|إنشاء/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
