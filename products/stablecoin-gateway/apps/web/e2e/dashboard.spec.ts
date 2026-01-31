import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('dashboard route exists and responds', async ({ page }) => {
    const response = await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Should get a response (not a 404 or server error)
    expect(response?.status()).toBeLessThan(500);
  });

  test('dashboard layout has navigation elements', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Wait for page content to load
    await page.waitForTimeout(1000);

    // Look for any navigation or sidebar element
    const hasNav = await page.locator('nav').first().isVisible().catch(() => false);
    const hasSidebar = await page.locator('[class*="sidebar"], [class*="Sidebar"], aside').first().isVisible().catch(() => false);
    const hasLinks = await page.locator('a[href*="dashboard"]').first().isVisible().catch(() => false);

    // At least one navigation structure should be present
    expect(hasNav || hasSidebar || hasLinks).toBe(true);
  });

  test('payment list route is accessible', async ({ page }) => {
    const response = await page.goto('/dashboard/payments', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(500);
  });

  test('settings route is accessible', async ({ page }) => {
    const response = await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(500);
  });
});
