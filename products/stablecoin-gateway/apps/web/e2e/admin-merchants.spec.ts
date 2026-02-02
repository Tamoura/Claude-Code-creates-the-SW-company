import { test, expect } from './fixtures/auth.fixture';
import { createUserWithApiKey, loginAsAdmin } from './fixtures/auth.fixture';

const API_URL = 'http://localhost:5001';

test.describe('Admin Merchant Management', () => {
  test.describe.configure({ mode: 'serial' });

  let merchantEmail: string;

  test.beforeAll(async ({ request }) => {
    // Create a merchant with a payment so admin has data to view
    const user = await createUserWithApiKey(request, 'e2e-admin-merchant');
    merchantEmail = user.email;

    // Create a payment session
    const payRes = await request.post(`${API_URL}/v1/payment-sessions`, {
      headers: { authorization: `Bearer ${user.apiKey}` },
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

  test('admin sidebar shows Admin section with Merchants link', async ({ page, request }) => {
    await loginAsAdmin(page, request);

    const sidebar = page.locator('aside');
    await expect(sidebar.locator('text=Admin')).toBeVisible();

    const merchantsLink = sidebar.locator('a', { hasText: 'Merchants' });
    await expect(merchantsLink).toBeVisible();
    await expect(merchantsLink).toHaveAttribute('href', '/dashboard/admin/merchants');
  });

  test('merchants list page shows table with merchant data', async ({ page, request }) => {
    await loginAsAdmin(page, request);

    await page.locator('aside a', { hasText: 'Merchants' }).click();
    await page.waitForURL('**/dashboard/admin/merchants', { timeout: 10000 });

    await expect(page.locator('text=All Merchants')).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Payments")')).toBeVisible();
    await expect(page.locator('th:has-text("Volume")')).toBeVisible();

    await expect(page.locator(`td:has-text("${merchantEmail}")`)).toBeVisible({ timeout: 5000 });
  });

  test('drill into merchant payments from list', async ({ page, request }) => {
    await loginAsAdmin(page, request);

    await page.locator('aside a', { hasText: 'Merchants' }).click();
    await page.waitForURL('**/dashboard/admin/merchants', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    const merchantRow = page.locator('tr', { has: page.locator(`td:has-text("${merchantEmail}")`) });
    await merchantRow.locator('a:has-text("View")').click();

    await page.waitForURL(/\/dashboard\/admin\/merchants\/.*\/payments/, { timeout: 10000 });

    await expect(page.locator('h2:has-text("Merchant Payments")')).toBeVisible();
    await expect(page.locator('a:has-text("Back to Merchants")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td:has-text("$99.99")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('td span:has-text("PENDING")')).toBeVisible();
    await expect(page.locator('td:has-text("USDC")')).toBeVisible();
  });

  test('back to merchants link navigates correctly', async ({ page, request }) => {
    await loginAsAdmin(page, request);

    await page.locator('aside a', { hasText: 'Merchants' }).click();
    await page.waitForURL('**/dashboard/admin/merchants', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    const merchantRow = page.locator('tr', { has: page.locator(`td:has-text("${merchantEmail}")`) });
    await merchantRow.locator('a:has-text("View")').click();
    await page.waitForURL(/\/dashboard\/admin\/merchants\/.*\/payments/, { timeout: 10000 });

    await page.locator('a:has-text("Back to Merchants")').click();
    await page.waitForURL('**/dashboard/admin/merchants', { timeout: 10000 });

    await expect(page.locator('text=All Merchants')).toBeVisible();
    await expect(page.locator(`td:has-text("${merchantEmail}")`)).toBeVisible({ timeout: 5000 });
  });
});
