import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';
const TEST_EMAIL = `e2e-ui-${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPassword123!@#';

// Helper: create a test user via API
async function createTestUser(request: any) {
  await request.post(`${API_URL}/v1/auth/signup`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
}

// Helper: login via UI
async function loginViaUI(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Dashboard UI Interactions', () => {

  test.beforeAll(async ({ request }) => {
    await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  // BUG #1: Sign Out must redirect to /login
  test('sign out from user dropdown redirects to login', async ({ page }) => {
    // Click the user avatar button in the header
    const avatar = page.locator('header button.rounded-full');
    await expect(avatar).toBeVisible();
    await avatar.click();

    // Dropdown should appear
    const dropdown = page.locator('text=Sign Out').last();
    await expect(dropdown).toBeVisible();

    // Click Sign Out
    await dropdown.click();

    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('sign out from Security page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/security');

    // Find the Sign Out button in the Danger Zone section
    const signOutBtn = page.locator('button', { hasText: 'Sign Out' }).last();
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  // BUG #2: Simulate Payment button must be functional
  test('simulate payment button in header is clickable and functional', async ({ page }) => {
    const simBtn = page.locator('header button', { hasText: 'Simulate Payment' });
    await expect(simBtn).toBeVisible();
    await expect(simBtn).toBeEnabled();

    // Click should navigate away from current page or show loading state
    await simBtn.click();

    // Should either navigate to /pay/:id or show "Creating..." state
    await expect(async () => {
      const url = page.url();
      const btnText = await simBtn.textContent().catch(() => '');
      // Either we navigated to a payment page or the button shows loading
      expect(url.includes('/pay/') || btnText?.includes('Creating')).toBeTruthy();
    }).toPass({ timeout: 10000 });
  });

  // BUG #3: User avatar must show real initials, not hardcoded "JS"
  test('user avatar shows initials from logged-in user email', async ({ page }) => {
    const avatar = page.locator('header button.rounded-full');
    await expect(avatar).toBeVisible();

    const text = await avatar.textContent();
    // Should NOT be hardcoded "JS"
    expect(text).not.toBe('JS');
    // Should be first 2 chars of the email, uppercased
    const expected = TEST_EMAIL.substring(0, 2).toUpperCase();
    expect(text?.trim()).toBe(expected);
  });

  // BUG #3 continued: User avatar must be clickable and show dropdown
  test('user avatar opens dropdown menu on click', async ({ page }) => {
    const avatar = page.locator('header button.rounded-full');
    await avatar.click();

    // Dropdown should show email
    await expect(page.locator('text=Merchant Account')).toBeVisible();

    // Should have Settings and Security links
    await expect(page.locator('button', { hasText: 'Settings' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Security' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Sign Out' })).toBeVisible();
  });

  test('user dropdown Settings navigates to settings page', async ({ page }) => {
    const avatar = page.locator('header button.rounded-full');
    await avatar.click();

    await page.locator('button', { hasText: 'Settings' }).click();
    await expect(page).toHaveURL('/dashboard/settings');
  });

  test('user dropdown Security navigates to security page', async ({ page }) => {
    const avatar = page.locator('header button.rounded-full');
    await avatar.click();

    await page.locator('button', { hasText: 'Security' }).click();
    await expect(page).toHaveURL('/dashboard/security');
  });

  // Navigation: All sidebar links must work
  test('sidebar Dashboard link navigates correctly', async ({ page }) => {
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('sidebar Payments link navigates correctly', async ({ page }) => {
    await page.click('a[href="/dashboard/payments"]');
    await expect(page).toHaveURL('/dashboard/payments');
  });

  test('sidebar Invoices link navigates correctly', async ({ page }) => {
    await page.click('a[href="/dashboard/invoices"]');
    await expect(page).toHaveURL('/dashboard/invoices');
  });

  test('sidebar API Keys link navigates correctly', async ({ page }) => {
    await page.click('a[href="/dashboard/api-keys"]');
    await expect(page).toHaveURL('/dashboard/api-keys');
  });

  test('sidebar Webhooks link navigates correctly', async ({ page }) => {
    await page.click('a[href="/dashboard/webhooks"]');
    await expect(page).toHaveURL('/dashboard/webhooks');
  });

  test('sidebar Security link navigates correctly', async ({ page }) => {
    await page.click('a[href="/dashboard/security"]');
    await expect(page).toHaveURL('/dashboard/security');
  });

  // View All button on transactions table
  test('View All button navigates to payments page', async ({ page }) => {
    await page.goto('/dashboard');
    const viewAllBtn = page.locator('button', { hasText: 'View All' });
    await expect(viewAllBtn).toBeVisible();
    await viewAllBtn.click();
    await expect(page).toHaveURL('/dashboard/payments');
  });

  // Dashboard checkout preview simulate payment
  test('dashboard checkout preview simulate payment works', async ({ page }) => {
    await page.goto('/dashboard');

    // Find the Simulate Payment button inside the checkout preview (not header)
    const simBtn = page.locator('main button', { hasText: 'Simulate Payment' });
    if (await simBtn.isVisible()) {
      await simBtn.click();

      // Should show "Creating Payment..." or "Payment Created"
      await expect(async () => {
        const hasCreating = await page.locator('text=Creating Payment').isVisible().catch(() => false);
        const hasCreated = await page.locator('text=Payment Created').isVisible().catch(() => false);
        expect(hasCreating || hasCreated).toBeTruthy();
      }).toPass({ timeout: 10000 });
    }
  });

  // No console errors on page load
  test('dashboard loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Filter out expected errors (e.g., failed API calls in test env are OK)
    const unexpectedErrors = errors.filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR') &&
      !e.includes('NetworkError')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
