import { test, expect } from '@playwright/test';

test.describe('RecomEngine — Smoke Tests', () => {
  test('home page loads and displays main heading', async ({ page }) => {
    await page.goto('/');

    // Page should load with visible heading
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('page title is set correctly', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');

    // Should have some navigation element
    const nav = page.locator('nav, header, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('app root element is rendered', async ({ page }) => {
    await page.goto('/');

    // React/Next.js app should render a root element with content
    const root = page.locator('#root, #__next, main, [data-testid="app"]').first();
    await expect(root).toBeVisible({ timeout: 10000 });
  });
});
