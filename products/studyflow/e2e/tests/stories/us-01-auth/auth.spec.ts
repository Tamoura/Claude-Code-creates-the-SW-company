import { test, expect } from '@playwright/test';
import {
  DEFAULT_PASSWORD,
  login,
  signupNewUser,
  uniqueEmail,
} from '../../../support/helpers';

/**
 * US-01 — Account registration & sign-in.
 * Covers AC-1 (signup → dashboard), AC-2 (duplicate email rejected),
 * AC-3 (login + invalid creds), AC-4 (protected route → /login when logged out).
 */
test.describe('US-01 — Auth', () => {
  test('[US-01][AC-1] signup with valid unique email lands on the dashboard', async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    // Real session: the signed-in email is rendered from auth state (AppShell).
    await expect(page.getByText(email)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();
  });

  test('[US-01][AC-1] signup rejects a password shorter than 8 chars (FR-001)', async ({
    page,
  }) => {
    await page.goto('/signup');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password').fill('short'); // < 8 chars
    await page.getByRole('button', { name: 'Create account' }).click();

    // Negative: stays on signup, shows the policy validation error, no redirect.
    await expect(
      page.getByText('Password must be at least 8 characters')
    ).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('[US-01][AC-2] signing up with an already-registered email is rejected (non-enumerating)', async ({
    page,
  }) => {
    // Arrange: create an account, then sign out.
    const user = await signupNewUser(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Act: try to sign up again with the same email.
    await page.goto('/signup');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Assert: rejected with a non-enumerating error, and we stay on /signup
    // (NOT taken to the dashboard). Scope to the form's error text — Next.js
    // renders a benign empty route-announcer alert, so a bare alert role is
    // ambiguous in strict mode.
    await expect(
      page.getByText('Could not create account with those details')
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });

  test('[US-01][AC-3] login with correct credentials, then sign out, then back in', async ({
    page,
  }) => {
    const user = await signupNewUser(page);

    // Sign out (AppShell button) → back to /login.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Log back in with the same credentials.
    await login(page, user);
    await expect(page.getByText(user.email)).toBeVisible();
  });

  test('[US-01][AC-3] login with invalid credentials shows a generic error', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password').fill('wrong-password-123');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Generic, non-enumerating message (NFR-007). Scoped to the text to avoid
    // the ambiguous benign route-announcer alert.
    await expect(
      page.getByText('Email or password is invalid')
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('[US-01][AC-4] visiting a protected route while logged out redirects to /login', async ({
    page,
  }) => {
    // Fresh context (no session). The (app) layout Guard must bounce to /login.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
  });
});
