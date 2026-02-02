import { test, expect } from './fixtures/auth.fixture';
import { createUserWithApiKey } from './fixtures/auth.fixture';

const API_URL = 'http://localhost:5001';

test.describe('Merchant Payment Status on Dashboard', () => {

  test('payment created via API key shows PENDING on dashboard', async ({ page, request, authenticatePage }) => {
    // Step 1: Create user with API key
    const user = await createUserWithApiKey(request, 'e2e-merchant');
    const { email, token, apiKey } = user;

    // Step 2: Create a payment session using the API key
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
    const paymentId = payBody.id;
    expect(payBody.status).toBe('PENDING');

    // Step 3: Login via UI with route interception
    await authenticatePage(page, user);

    // Step 4: Verify dashboard content loaded
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Wait for transactions table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Step 5: Verify PENDING badge is visible
    const pendingBadges = page.locator('span.rounded-full:has-text("PENDING")');
    await expect(pendingBadges.first()).toBeVisible({ timeout: 5000 });

    // Step 6: Verify our specific payment ID appears in the table
    const txIdFormatted = `#${paymentId.replace('ps_', 'TX-').toUpperCase()}`;
    await expect(page.locator(`text=${txIdFormatted}`)).toBeVisible();

    // Step 7: No FAILED badges
    const failedBadges = page.locator('span.rounded-full:has-text("FAILED")');
    await expect(failedBadges).toHaveCount(0);
  });
});
