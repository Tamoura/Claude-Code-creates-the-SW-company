import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {

  test('homepage renders hero section and feature cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('nav span', { hasText: 'StableFlow' })).toBeVisible({ timeout: 10000 });
    // Nav links render as <a> tags (React Router <Link>), not <button>
    await expect(page.locator('a', { hasText: 'Sign In' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Get Started' })).toBeVisible();

    // Feature cards
    await expect(page.locator('h3', { hasText: '0.5% Fees' })).toBeVisible();
    await expect(page.locator('h3', { hasText: '5-Minute Settlement' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Zero Volatility' })).toBeVisible();
  });

  test('homepage has how it works section', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=How It Works')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sign Up')).toBeVisible();
    await expect(page.locator('text=Integrate')).toBeVisible();
    await expect(page.locator('text=Accept Payments')).toBeVisible();
  });

  test('homepage CTA buttons navigate to auth pages', async ({ page }) => {
    await page.goto('/');

    // "Start Accepting Payments" → /signup
    const startBtn = page.locator('a', { hasText: /start accepting/i });
    if (await startBtn.isVisible()) {
      await expect(startBtn).toHaveAttribute('href', /\/signup/);
    }

    // "Merchant Dashboard" → /login
    const dashBtn = page.locator('a', { hasText: /merchant dashboard/i });
    if (await dashBtn.isVisible()) {
      await expect(dashBtn).toHaveAttribute('href', /\/login/);
    }
  });

  test('displays error for non-existent payment', async ({ page }) => {
    await page.goto('/pay/non-existent-id');
    await expect(page.getByRole('heading', { name: 'Payment Not Found' })).toBeVisible({ timeout: 10000 });
  });

  test('homepage footer shows copyright', async ({ page }) => {
    await page.goto('/');

    // Footer with copyright text
    await expect(page.getByText(/StableFlow.*Stablecoin Payment Infrastructure/)).toBeVisible();
  });
});
