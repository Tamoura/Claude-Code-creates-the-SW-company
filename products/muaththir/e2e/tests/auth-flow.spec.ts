import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Main heading should be visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Form fields should be present
    await expect(page.locator('#email, input[type="email"]').first()).toBeVisible();
    await expect(page.locator('#password, input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();

    // Check if validation prevents submission
    const emailInput = page.locator('#email, input[type="email"]').first();
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    const signupLink = page.locator('a[href="/signup"]').first();
    await expect(signupLink).toBeVisible();
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/login');

    const forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotPasswordLink).toBeVisible();
  });

  test('signup page renders with required fields', async ({ page }) => {
    await page.goto('/signup');

    // Main heading should be visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Form fields should be present
    await expect(page.locator('#email, input[type="email"]').first()).toBeVisible();
    await expect(page.locator('#password, input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('signup form validates required fields', async ({ page }) => {
    await page.goto('/signup');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();

    // Check if validation prevents submission
    const emailInput = page.locator('#email, input[type="email"]').first();
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    const loginLink = page.locator('a[href="/login"]').first();
    await expect(loginLink).toBeVisible();
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');

    // Main heading should be visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Email field should be present
    await expect(page.locator('#email, input[type="email"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('forgot password form validates email field', async ({ page }) => {
    await page.goto('/forgot-password');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();

    // Check if validation prevents submission
    const emailInput = page.locator('#email, input[type="email"]').first();
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });
});
