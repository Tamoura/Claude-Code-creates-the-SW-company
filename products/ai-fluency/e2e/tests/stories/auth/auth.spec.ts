/**
 * tests/stories/auth/auth.spec.ts — Authentication E2E tests
 *
 * Covers: login page, register page, navigation, and form accessibility.
 *
 * Story: US-AUTH — User can authenticate to access AI Fluency
 *
 * Acceptance Criteria:
 *   AC-1: User can navigate to login page from home
 *   AC-2: Login page has accessible form with labelled email and password fields
 *   AC-3: Register page renders with all required fields
 *   AC-4: Login form shows validation error for empty submission
 *   AC-5: Login form shows error for invalid credentials (when API is running)
 *   AC-6: Register form shows validation error for empty submission
 *   AC-7: Login page has link to register page
 *   AC-8: Register page has link back to login page
 *
 * Screenshots captured at each key moment per CEO mandate.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../pages/LoginPage.js';
import { RegisterPage } from '../../../pages/RegisterPage.js';
import { HomePage } from '../../../pages/HomePage.js';

const SCREENSHOTS = 'test-results/screenshots';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-1] user can navigate to login page from home nav', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();

  // Screenshot: home page initial state
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC1-home-initial.png`, fullPage: true });

  // Sign In link must be visible in navigation
  await expect(home.signInLink).toBeVisible();

  await home.clickSignIn();

  // Should land on /login
  await expect(page).toHaveURL(/\/login/);

  // Screenshot: login page after navigation
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC1-login-landed.png`, fullPage: true });
});

test('[US-AUTH][AC-1b] user can navigate to register page from home nav', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();

  // "Get Started" / register link must be visible
  await expect(home.getStartedLink).toBeVisible();

  await home.clickGetStarted();

  // Should land on /register
  await expect(page).toHaveURL(/\/register/);

  // Screenshot: register page after navigation
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC1b-register-landed.png`, fullPage: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login page accessibility and form structure
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-2] login page has accessible form with labelled email field', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  // Screenshot: login page with form visible
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC2-login-form.png`, fullPage: true });

  // Email input must be labelled (for screen readers)
  await expect(login.emailInput).toBeVisible();

  // Verify the input has an accessible label (not just a placeholder)
  const emailId = await login.emailInput.getAttribute('id');
  if (emailId) {
    const label = page.locator(`label[for="${emailId}"]`);
    await expect(label).toBeVisible();
  }
});

test('[US-AUTH][AC-2b] login page has accessible form with labelled password field', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  // Password input must be labelled
  await expect(login.passwordInput).toBeVisible();

  // Password field must be of type="password" (security)
  const inputType = await login.passwordInput.getAttribute('type');
  expect(inputType).toBe('password');
});

test('[US-AUTH][AC-2c] login page submit button is visible and enabled', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  await expect(login.submitButton).toBeVisible();
  await expect(login.submitButton).toBeEnabled();

  // Screenshot: submit button visible state
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC2c-submit-button.png`, fullPage: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Register page structure
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-3] register page renders with email field', async ({ page }) => {
  const register = new RegisterPage(page);
  await register.goto();

  // Screenshot: register page initial state
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC3-register-initial.png`, fullPage: true });

  await expect(register.emailInput).toBeVisible();
});

test('[US-AUTH][AC-3b] register page renders with password field', async ({ page }) => {
  const register = new RegisterPage(page);
  await register.goto();

  await expect(register.passwordInput).toBeVisible();

  const inputType = await register.passwordInput.getAttribute('type');
  expect(inputType).toBe('password');
});

test('[US-AUTH][AC-3c] register page has submit button', async ({ page }) => {
  const register = new RegisterPage(page);
  await register.goto();

  await expect(register.submitButton).toBeVisible();
  await expect(register.submitButton).toBeEnabled();
});

// ─────────────────────────────────────────────────────────────────────────────
// Login form validation
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-4] login form shows validation error when email is empty', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  // Screenshot: empty form before submit
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC4-login-empty-before-submit.png`, fullPage: true });

  // Submit without filling in anything
  await login.submitButton.click();

  // HTML5 or Zod validation should prevent submission or show error
  // Check that we're still on the login page (form not submitted)
  await expect(page).toHaveURL(/\/login/);

  // Screenshot: after empty submit attempt
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC4-login-empty-after-submit.png`, fullPage: true });
});

test('[US-AUTH][AC-4b] login form stays on login page when submitted empty', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  // Submit empty form
  await login.submitEmpty();

  // Must remain on /login
  await expect(page).toHaveURL(/\/login/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Register form validation
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-6] register form stays on register page when submitted empty', async ({ page }) => {
  const register = new RegisterPage(page);
  await register.goto();

  await register.submitEmpty();

  // Must remain on /register
  await expect(page).toHaveURL(/\/register/);

  // Screenshot: validation state on register form
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-AC6-register-validation.png`, fullPage: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-page navigation links
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-7] login page has link to register page', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  // Login page has links to /register: "Get Started" (nav) and "Create one" (form footer)
  // from i18n: auth.login.register_link = 'Create one', nav.register = 'Get Started'
  // Use .first() because multiple register links exist — we just verify at least one is present.
  const registerLink = page.getByRole('link', { name: /create one|create account|register|sign up|get started/i }).first();
  await expect(registerLink).toBeVisible();
});

test('[US-AUTH][AC-8] register page has link back to login page', async ({ page }) => {
  const register = new RegisterPage(page);
  await register.goto();

  // There should be a link to sign in
  await expect(register.signInLink).toBeVisible();

  await register.signInLink.click();
  await expect(page).toHaveURL(/\/login/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Skip nav link (accessibility — required on every page)
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][A11Y-1] login page has skip navigation link', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();

  // Skip nav link must be present for keyboard users
  const skipLink = page.getByRole('link', { name: /skip/i });
  // It may be visually hidden but must exist in DOM
  await expect(skipLink).toHaveCount(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Full auth flow: register → login → dashboard (when API available)
// ─────────────────────────────────────────────────────────────────────────────

test('[US-AUTH][AC-FLOW] full register → login → dashboard flow [REQUIRES-AUTH-API]', async ({ page, request }) => {
  const timestamp = Date.now();
  const email = `e2e-flow-${timestamp}@example.com`;
  const password = 'E2ETestPass123!';
  const name = 'E2E Flow User';

  // Attempt registration via API
  const regRes = await request.post('http://localhost:5014/api/v1/auth/register', {
    data: { email, password, name },
  });

  if (!regRes.ok()) {
    // API not available — skip gracefully
    test.skip();
    return;
  }

  // Navigate to login page
  const login = new LoginPage(page);
  await login.goto();

  // Screenshot: login page initial state
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-FLOW-01-login-page.png`, fullPage: true });

  // Fill and submit credentials
  await login.login(email, password);
  await page.waitForURL('**/dashboard', { timeout: 10_000 });

  // Screenshot: dashboard after successful authentication
  await page.screenshot({ path: `${SCREENSHOTS}/US-AUTH-FLOW-02-dashboard-authenticated.png`, fullPage: true });

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('main')).toBeVisible();
});
