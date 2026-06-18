import { test, expect } from '@playwright/test';

test.describe('Auth Edge Cases', () => {
  test.describe('Signup validation', () => {
    test('shows error for password shorter than 8 characters', async ({
      page,
    }) => {
      await page.goto('/signup');

      await page.getByLabel('Password', { exact: true }).fill('Ab1!');
      await page.getByLabel(/confirm password/i).fill('Ab1!');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/at least 8 characters/i)
      ).toBeVisible();
    });

    test('shows error for password without uppercase letter', async ({
      page,
    }) => {
      await page.goto('/signup');

      await page.getByLabel('Password', { exact: true }).fill('abcdefg1!');
      await page.getByLabel(/confirm password/i).fill('abcdefg1!');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/uppercase/i)
      ).toBeVisible();
    });

    test('shows error for password without lowercase letter', async ({
      page,
    }) => {
      await page.goto('/signup');

      await page.getByLabel('Password', { exact: true }).fill('ABCDEFG1!');
      await page.getByLabel(/confirm password/i).fill('ABCDEFG1!');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/lowercase/i)
      ).toBeVisible();
    });

    test('shows error for password without number', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel('Password', { exact: true }).fill('Abcdefgh!');
      await page.getByLabel(/confirm password/i).fill('Abcdefgh!');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/number/i)
      ).toBeVisible();
    });

    test('shows error for password without special character', async ({
      page,
    }) => {
      await page.goto('/signup');

      await page.getByLabel('Password', { exact: true }).fill('Abcdefg1');
      await page.getByLabel(/confirm password/i).fill('Abcdefg1');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/special character/i)
      ).toBeVisible();
    });

    test('shows error when passwords do not match', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel('Password', { exact: true }).fill('E2eTest!234');
      await page.getByLabel(/confirm password/i).fill('DifferentP@ss1');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/passwords do not match/i)
      ).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel(/work email/i).fill('not-an-email');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/valid email/i)
      ).toBeVisible();
    });

    test('shows error for name too short', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel(/full name/i).fill('A');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/at least 2 characters/i)
      ).toBeVisible();
    });

    test('shows error for company name too short', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel(/company name/i).fill('X');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(
        page.getByText(/at least 2 characters/i)
      ).toBeVisible();
    });
  });

  test.describe('Login validation', () => {
    test('shows error for invalid login credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('nonexistent@test.com');
      await page.getByLabel(/password/i).fill('WrongP@ss1');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show server error (invalid credentials) or network error
      await expect(
        page.getByRole('alert')
      ).toBeVisible({ timeout: 15_000 });
    });

    test('shows validation error for empty email', async ({ page }) => {
      await page.goto('/login');

      // Only fill password, leave email empty
      await page.getByLabel(/password/i).fill('SomePass1!');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(
        page.getByText(/valid email/i)
      ).toBeVisible();
    });

    test('shows validation error for empty password', async ({ page }) => {
      await page.goto('/login');

      // Only fill email, leave password empty
      await page.getByLabel(/email/i).fill('user@test.com');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(
        page.getByText(/password is required/i)
      ).toBeVisible();
    });
  });

  test.describe('Login form accessibility', () => {
    test('email input has correct autocomplete attribute', async ({
      page,
    }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    test('password input has correct autocomplete attribute', async ({
      page,
    }) => {
      await page.goto('/login');

      const passwordInput = page.getByLabel(/password/i);
      await expect(passwordInput).toHaveAttribute(
        'autocomplete',
        'current-password'
      );
    });

    test('email input sets aria-invalid on error', async ({ page }) => {
      await page.goto('/login');

      // Submit empty to trigger validation
      await page.getByRole('button', { name: /sign in/i }).click();

      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  test.describe('Signup form accessibility', () => {
    test('password fields use new-password autocomplete', async ({
      page,
    }) => {
      await page.goto('/signup');

      const passwordInput = page.getByLabel('Password', { exact: true });
      await expect(passwordInput).toHaveAttribute(
        'autocomplete',
        'new-password'
      );

      const confirmInput = page.getByLabel(/confirm password/i);
      await expect(confirmInput).toHaveAttribute(
        'autocomplete',
        'new-password'
      );
    });

    test('name input uses name autocomplete', async ({ page }) => {
      await page.goto('/signup');

      const nameInput = page.getByLabel(/full name/i);
      await expect(nameInput).toHaveAttribute('autocomplete', 'name');
    });
  });

  test.describe('Navigation between auth pages', () => {
    test('login page links to signup', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('link', { name: /create an account/i }).click();
      await expect(page).toHaveURL('/signup');
    });

    test('signup page links to login', async ({ page }) => {
      await page.goto('/signup');

      await page.getByRole('link', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Submit button states', () => {
    test('signup button shows loading state during submission', async ({
      page,
    }) => {
      await page.goto('/signup');

      // Fill valid data so form passes client validation
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByLabel(/work email/i).fill(`load-${Date.now()}@test.com`);
      await page.getByLabel(/company name/i).fill('Test Corp');
      await page.getByLabel('Password', { exact: true }).fill('E2eTest!234');
      await page.getByLabel(/confirm password/i).fill('E2eTest!234');

      const button = page.getByRole('button', { name: /create account/i });
      await button.click();

      // Button should show loading text (may be brief)
      await expect(
        page.getByRole('button', { name: /creating account/i })
      ).toBeVisible();
    });

    test('login button shows loading state during submission', async ({
      page,
    }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('SomePass1!');

      const button = page.getByRole('button', { name: /sign in/i });
      await button.click();

      // Button should show loading text (may be brief)
      await expect(
        page.getByRole('button', { name: /signing in/i })
      ).toBeVisible();
    });
  });
});
