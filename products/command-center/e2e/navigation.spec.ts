import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test('sidebar renders with branding and all nav sections', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('aside h1')).toContainText('ConnectSW');
    await expect(page.locator('aside')).toContainText('Command Center');
    await expect(page.locator('aside')).toContainText('v0.4.0');
  });

  test('sidebar has all navigation links', async ({ page }) => {
    await page.goto('/overview');

    // Dashboard section
    await expect(page.locator('a[href="/overview"]')).toBeVisible();
    await expect(page.locator('a[href="/health"]')).toBeVisible();
    await expect(page.locator('a[href="/alerts"]')).toBeVisible();

    // Portfolio section
    await expect(page.locator('a[href="/products"]')).toBeVisible();
    await expect(page.locator('a[href="/agents"]')).toBeVisible();
    await expect(page.locator('a[href="/workflows"]')).toBeVisible();

    // Quality & Ops section
    await expect(page.locator('a[href="/quality-gates"]')).toBeVisible();
    await expect(page.locator('a[href="/audit"]')).toBeVisible();
    await expect(page.locator('a[href="/sprint"]')).toBeVisible();
    await expect(page.locator('a[href="/monitor"]')).toBeVisible();

    // System section
    await expect(page.locator('a[href="/activity"]')).toBeVisible();
    await expect(page.locator('a[href="/git-analytics"]')).toBeVisible();
    await expect(page.locator('a[href="/knowledge"]')).toBeVisible();
    await expect(page.locator('a[href="/components"]')).toBeVisible();
    await expect(page.locator('a[href="/infrastructure"]')).toBeVisible();
    await expect(page.locator('a[href="/operations"]')).toBeVisible();
    await expect(page.locator('a[href="/invoke"]')).toBeVisible();
    await expect(page.locator('a[href="/settings"]')).toBeVisible();
  });

  test('root path redirects to /overview', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/overview/);
  });

  test('active nav link is highlighted with blue style', async ({ page }) => {
    await page.goto('/products');
    const navLink = page.locator('a[href="/products"]');
    await expect(navLink).toHaveClass(/text-blue-400/);
  });
});
