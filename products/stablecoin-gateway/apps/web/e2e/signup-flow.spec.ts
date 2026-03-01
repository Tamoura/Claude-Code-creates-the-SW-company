import { test, expect } from './fixtures/auth.fixture';

test.describe('Signup Flow', () => {

  test('signup page renders form fields', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Create account');
  });

  test('password requirements update in real-time', async ({ page }) => {
    await page.goto('/signup');

    const passwordInput = page.locator('#password');

    // Initially all requirements should show as unmet (bullet markers)
    await expect(page.getByText('At least 12 characters')).toBeVisible();
    await expect(page.getByText('One uppercase letter')).toBeVisible();

    // Type a short password — only some requirements met
    await passwordInput.fill('abc');
    // "One lowercase letter" should now be met (checkmark)
    await expect(page.locator('text=✓').first()).toBeVisible();

    // Type a password that meets all requirements
    await passwordInput.fill('StrongPass123!');
    // All 5 requirements should show checkmarks
    const checkmarks = page.locator('text=✓');
    await expect(checkmarks).toHaveCount(5);
  });

  test('password mismatch shows error indicator', async ({ page }) => {
    await page.goto('/signup');

    await page.locator('#password').fill('StrongPass123!');
    await page.locator('#confirm-password').fill('DifferentPass123!');

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('password match shows success indicator', async ({ page }) => {
    await page.goto('/signup');

    await page.locator('#password').fill('StrongPass123!');
    await page.locator('#confirm-password').fill('StrongPass123!');

    await expect(page.getByText(/Passwords match/)).toBeVisible();
  });

  test('submit button disabled until form is valid', async ({ page }) => {
    await page.goto('/signup');

    const submitBtn = page.locator('button[type="submit"]');

    // Initially disabled
    await expect(submitBtn).toBeDisabled();

    // Fill email only — still disabled
    await page.locator('#email').fill('test@example.com');
    await expect(submitBtn).toBeDisabled();

    // Fill weak password — still disabled
    await page.locator('#password').fill('weak');
    await expect(submitBtn).toBeDisabled();

    // Fill strong password but no confirm — still disabled
    await page.locator('#password').fill('StrongPass123!');
    await expect(submitBtn).toBeDisabled();

    // Fill mismatched confirm — still disabled
    await page.locator('#confirm-password').fill('Wrong');
    await expect(submitBtn).toBeDisabled();

    // Fill matching confirm — still disabled without terms agreement
    await page.locator('#confirm-password').fill('StrongPass123!');
    await expect(submitBtn).toBeDisabled();

    // Agree to terms — now enabled
    await page.locator('input[type="checkbox"]').check();
    await expect(submitBtn).toBeEnabled();
  });

  test('successful signup redirects to dashboard', async ({ page }) => {
    // Intercept signup API to avoid auth rate limiting (5 req/15min)
    await page.route('**/v1/auth/signup', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'e2e-signup@test.com',
          role: 'MERCHANT',
          access_token: 'fake-access-token-for-redirect-test',
          refresh_token: 'fake-refresh-token',
        }),
      });
    });

    await page.goto('/signup');

    await page.locator('#email').fill('e2e-signup@test.com');
    await page.locator('#password').fill('StrongPass123!');
    await page.locator('#confirm-password').fill('StrongPass123!');
    await page.locator('input[type="checkbox"]').check();

    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('signup with existing email shows error', async ({ page }) => {
    // Use route interception to return a 409 duplicate email error
    // (avoids rate-limit issues on auth endpoints: 5 req/15min)
    await page.route('**/v1/auth/signup', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'https://gateway.io/errors/user-exists',
          title: 'User Exists',
          status: 409,
          detail: 'User with this email already exists',
        }),
      });
    });

    await page.goto('/signup');

    await page.locator('#email').fill('existing@test.com');
    await page.locator('#password').fill('StrongPass123!');
    await page.locator('#confirm-password').fill('StrongPass123!');
    await page.locator('input[type="checkbox"]').check();

    await page.locator('button[type="submit"]').click();

    // Error should be displayed
    await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('User with this email already exists')).toBeVisible();
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');

    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await page.waitForURL('**/login');
  });
});
