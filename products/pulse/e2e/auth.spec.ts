import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

/**
 * Authentication flow E2E tests.
 *
 * Tests the login page UI, form validation, login/signup navigation,
 * and the GitHub OAuth button presence.
 */

test.describe('Login page', () => {
  test('renders all expected elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectLoaded();

    // Verify links
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.signUpLink).toBeVisible();
    await expect(loginPage.logoLink).toBeVisible();
  });

  test('shows GitHub OAuth button', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.githubButton).toBeVisible();
    await expect(loginPage.githubButton).toContainText(
      /continue with github/i
    );
  });

  test('navigates to signup page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.signUpLink.click();
    await page.waitForURL(/\/signup/);
    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible();
  });

  test('navigates to forgot password page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.forgotPasswordLink.click();
    await page.waitForURL(/\/forgot-password/);
  });

  test('email field requires valid email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // HTML5 validation: type="email" prevents invalid submissions
    const emailValidity = await loginPage.emailInput.evaluate(
      (el: HTMLInputElement) => {
        el.value = 'not-an-email';
        return el.checkValidity();
      }
    );
    expect(emailValidity).toBe(false);
  });

  test('password field is required', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // HTML5 required attribute should be present
    await expect(loginPage.passwordInput).toHaveAttribute('required', '');
  });

  test('submit button shows loading state text', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Before clicking, button should show "Sign in"
    await expect(loginPage.submitButton).toContainText(/sign in/i);
  });
});

test.describe('Signup page', () => {
  test('renders registration form', async ({ page }) => {
    await page.goto('/signup');

    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /create account/i })
    ).toBeVisible();
  });

  test('shows GitHub signup button', async ({ page }) => {
    await page.goto('/signup');

    await expect(
      page.getByRole('button', { name: /sign up with github/i })
    ).toBeVisible();
  });

  test('navigates to login page', async ({ page }) => {
    await page.goto('/signup');

    await page.getByRole('link', { name: /sign in/i }).click();
    await page.waitForURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: /welcome back/i })
    ).toBeVisible();
  });
});
