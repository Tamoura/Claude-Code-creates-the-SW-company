import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'Test123!@#';

/**
 * Admin Merchant Management E2E
 *
 * Verifies the full admin flow:
 * 1. Admin login → sidebar shows "Admin" section with "Merchants" link
 * 2. Merchants list page renders with merchant data
 * 3. Drill into a specific merchant's payments
 * 4. Navigate back to merchants list
 *
 * Depends on seeded admin user (admin@test.com / Test123!@#).
 */

test.describe('Admin Merchant Management', () => {
  let merchantEmail: string;
  const merchantPassword = 'TestPassword123!@#';

  test.beforeAll(async ({ request }) => {
    // Create a merchant with a payment so admin has data to view
    merchantEmail = `e2e-admin-merchant-${Date.now()}@test.com`;

    // 1. Sign up merchant via API
    const signupRes = await request.post(`${API_URL}/v1/auth/signup`, {
      data: { email: merchantEmail, password: merchantPassword },
    });
    expect(signupRes.ok()).toBeTruthy();
    const { access_token } = await signupRes.json();

    // 2. Create API key with write permission
    const keyRes = await request.post(`${API_URL}/v1/api-keys`, {
      headers: { authorization: `Bearer ${access_token}` },
      data: {
        name: 'E2E Admin Test Key',
        permissions: { read: true, write: true, refund: false },
      },
    });
    expect(keyRes.ok()).toBeTruthy();
    const { key: apiKey } = await keyRes.json();

    // 3. Create a payment session
    const payRes = await request.post(`${API_URL}/v1/payment-sessions`, {
      headers: { authorization: `Bearer ${apiKey}` },
      data: {
        amount: 99.99,
        currency: 'USD',
        description: 'Admin E2E test payment',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    expect(payRes.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('admin sidebar shows Admin section with Merchants link', async ({ page }) => {
    const sidebar = page.locator('aside');

    // Admin section header should be visible
    await expect(sidebar.locator('text=Admin')).toBeVisible();

    // Merchants link should be visible and point to correct route
    const merchantsLink = sidebar.locator('a', { hasText: 'Merchants' });
    await expect(merchantsLink).toBeVisible();
    await expect(merchantsLink).toHaveAttribute('href', '/dashboard/admin/merchants');
  });

  test('merchants list page shows table with merchant data', async ({ page }) => {
    // Navigate to merchants page via sidebar
    await page.locator('aside a', { hasText: 'Merchants' }).click();
    await page.waitForURL('/dashboard/admin/merchants', { timeout: 10000 });

    // Page header
    await expect(page.locator('text=All Merchants')).toBeVisible();

    // Table should be visible with data
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Column headers present
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Payments")')).toBeVisible();
    await expect(page.locator('th:has-text("Volume")')).toBeVisible();

    // Our test merchant's email should appear in the table
    await expect(page.locator(`td:has-text("${merchantEmail}")`)).toBeVisible({ timeout: 5000 });
  });

  test('drill into merchant payments from list', async ({ page }) => {
    // Navigate to merchants page
    await page.locator('aside a', { hasText: 'Merchants' }).click();
    await page.waitForURL('/dashboard/admin/merchants', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Find our merchant row and click View
    const merchantRow = page.locator('tr', { has: page.locator(`td:has-text("${merchantEmail}")`) });
    await merchantRow.locator('a:has-text("View")').click();

    // Should navigate to merchant payments page
    await page.waitForURL(/\/dashboard\/admin\/merchants\/.*\/payments/, { timeout: 10000 });

    // Page header and navigation
    await expect(page.locator('text=Merchant Payments')).toBeVisible();
    await expect(page.locator('a:has-text("Back to Merchants")')).toBeVisible();

    // Payment table should render
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Our payment amount ($99.99) should appear
    await expect(page.locator('td:has-text("$99.99")')).toBeVisible({ timeout: 5000 });

    // PENDING status badge
    await expect(page.locator('text=PENDING')).toBeVisible();

    // Asset info (USDC / polygon)
    await expect(page.locator('td:has-text("USDC")')).toBeVisible();
  });

  test('back to merchants link navigates correctly', async ({ page }) => {
    // Navigate to merchants → merchant payments
    await page.locator('aside a', { hasText: 'Merchants' }).click();
    await page.waitForURL('/dashboard/admin/merchants', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    const merchantRow = page.locator('tr', { has: page.locator(`td:has-text("${merchantEmail}")`) });
    await merchantRow.locator('a:has-text("View")').click();
    await page.waitForURL(/\/dashboard\/admin\/merchants\/.*\/payments/, { timeout: 10000 });

    // Click back link
    await page.locator('a:has-text("Back to Merchants")').click();
    await page.waitForURL('/dashboard/admin/merchants', { timeout: 10000 });

    // Should be back on merchants list
    await expect(page.locator('text=All Merchants')).toBeVisible();
    await expect(page.locator(`td:has-text("${merchantEmail}")`)).toBeVisible({ timeout: 5000 });
  });
});
