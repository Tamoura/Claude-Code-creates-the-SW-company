import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';

/**
 * Merchant Payment → Dashboard Status Display
 *
 * Verifies that when a merchant creates a payment via API key,
 * the dashboard correctly shows the payment as PENDING (not FAILED).
 *
 * This test covers the full flow:
 * 1. Signup + API key creation via API
 * 2. Payment creation via API key
 * 3. Login via UI
 * 4. Dashboard verification — PENDING badge appears, no FAILED badge
 */

test.describe('Merchant Payment Status on Dashboard', () => {
  let email: string;
  const password = 'TestPassword123!@#';
  let paymentId: string;

  test('payment created via API key shows PENDING on dashboard', async ({ page, request }) => {
    email = `e2e-merchant-${Date.now()}@test.com`;

    // Step 1: Signup via API
    const signupRes = await request.post(`${API_URL}/v1/auth/signup`, {
      data: { email, password },
    });
    expect(signupRes.ok()).toBeTruthy();
    const { access_token } = await signupRes.json();

    // Step 2: Create API key with write permission
    const keyRes = await request.post(`${API_URL}/v1/api-keys`, {
      headers: { authorization: `Bearer ${access_token}` },
      data: {
        name: 'E2E Merchant Key',
        permissions: { read: true, write: true, refund: false },
      },
    });
    expect(keyRes.ok()).toBeTruthy();
    const keyBody = await keyRes.json();
    const apiKey = keyBody.key;

    // Step 3: Create a payment session using the API key
    const payRes = await request.post(`${API_URL}/v1/payment-sessions`, {
      headers: { authorization: `Bearer ${apiKey}` },
      data: {
        amount: 42.00,
        currency: 'USD',
        description: 'E2E test payment',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    expect(payRes.ok()).toBeTruthy();
    const payBody = await payRes.json();
    paymentId = payBody.id;
    expect(payBody.status).toBe('PENDING');

    // Step 4: Login via UI
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Step 5: Wait for dashboard to load
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Wait for transactions table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Step 6: Verify PENDING badge is visible
    const pendingBadges = page.locator('span.rounded-full:has-text("PENDING")');
    await expect(pendingBadges.first()).toBeVisible({ timeout: 5000 });

    // Step 7: Verify our specific payment ID appears in the table
    const txIdFormatted = `#${paymentId.replace('ps_', 'TX-').toUpperCase()}`;
    await expect(page.locator(`text=${txIdFormatted}`)).toBeVisible();

    // Step 8: No FAILED badges — our only payment is PENDING
    const failedBadges = page.locator('span.rounded-full:has-text("FAILED")');
    await expect(failedBadges).toHaveCount(0);
  });
});
