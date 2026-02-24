import { test, expect } from '@playwright/test';

/**
 * Auth E2E tests.
 *
 * These tests exercise the full registration -> login -> dashboard -> logout
 * flow against the real API and frontend. A unique email is generated per
 * test run to avoid collisions when the test database persists between runs.
 */

const TEST_USER = {
  fullName: 'E2E Auth Tester',
  email: `e2e-auth-${Date.now()}@test.com`,
  password: 'E2eTestPass123!@#',
};

test.describe('Auth Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('register creates account and shows success', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/Full name/i).fill(TEST_USER.fullName);
    await page.getByLabel(/Email/i).fill(TEST_USER.email);
    await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password);
    await page.getByLabel(/Confirm password/i).fill(TEST_USER.password);

    await page.getByRole('button', { name: /Create account/i }).click();

    // Should show success message or redirect to login
    await expect(
      page
        .getByText(/Account created/i)
        .or(page.getByRole('heading', { name: /Welcome back/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test('login with new account redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/Email/i).fill(TEST_USER.email);
    await page.getByLabel(/Password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /Sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page.url()).toContain('/dashboard');
  });

  test('dashboard shows user content after login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(TEST_USER.email);
    await page.getByLabel(/Password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // Dashboard should have meaningful content
    await expect(
      page
        .getByText(/project/i)
        .or(page.getByText(/dashboard/i))
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/Email/i).fill(TEST_USER.email);
    await page.getByLabel(/Password/i).fill('WrongPassword999!');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('register with existing email shows error', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/Full name/i).fill('Duplicate User');
    await page.getByLabel(/Email/i).fill(TEST_USER.email);
    await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password);
    await page.getByLabel(/Confirm password/i).fill(TEST_USER.password);

    await page.getByRole('button', { name: /Create account/i }).click();

    // Should show error about duplicate email
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('register with mismatched passwords shows error', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/Full name/i).fill('Mismatch User');
    await page.getByLabel(/Email/i).fill('mismatch@test.com');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel(/Confirm password/i).fill('DifferentPass456!');

    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(
      page.getByText(/passwords do not match/i),
    ).toBeVisible({ timeout: 5000 });
  });
});
