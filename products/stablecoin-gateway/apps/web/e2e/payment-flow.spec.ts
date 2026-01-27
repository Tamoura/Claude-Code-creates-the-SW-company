import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test('complete payment flow from link creation to confirmation', async ({ page }) => {
    // Step 1: Navigate to home page
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify homepage loaded
    await expect(page.getByText('Stablecoin Gateway')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create Payment Link')).toBeVisible();

    // Step 2: Create payment link
    const amountInput = page.getByLabel('Amount (USD)');
    await amountInput.fill('100');

    await page.getByRole('button', { name: /generate payment link/i }).click();

    // Verify link was generated
    await expect(page.getByText('Payment Link Created!')).toBeVisible();

    // Step 3: Navigate to payment page
    await page.getByRole('button', { name: /view payment page/i }).click();

    // Verify payment page loaded with correct amount
    await expect(page.getByText('Complete Payment')).toBeVisible();
    await expect(page.getByText('$100.00')).toBeVisible();

    // Verify fee calculation
    await expect(page.getByText('$0.50')).toBeVisible(); // 0.5% of $100

    // Step 4: Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();

    // Wait for wallet connection (1 second delay)
    await expect(page.getByText('Wallet Connected')).toBeVisible({ timeout: 3000 });

    // Verify wallet address displayed
    await expect(page.getByText(/0x742d/)).toBeVisible();

    // Step 5: Make payment
    await page.getByRole('button', { name: /pay \$100\.00/i }).click();

    // Should redirect to status page
    await expect(page.getByText('Payment Complete')).toBeVisible({ timeout: 15000 });

    // Verify transaction completed
    await expect(page.getByText('Payment successfully received!')).toBeVisible();
    await expect(page.getByText('Transaction Hash')).toBeVisible();

    // Verify progress steps are complete
    await expect(page.locator('text=Complete').first()).toBeVisible();
  });

  test('displays error for non-existent payment', async ({ page }) => {
    await page.goto('/pay/non-existent-id', { waitUntil: 'networkidle' });
    await expect(page.getByText('Payment Not Found')).toBeVisible({ timeout: 10000 });
  });

  test('form accepts valid amount', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const amountInput = page.getByLabel('Amount (USD)');
    await expect(amountInput).toBeVisible({ timeout: 10000 });

    // Verify form accepts valid input
    await amountInput.fill('50');
    await expect(amountInput).toHaveValue('50');
  });
});
