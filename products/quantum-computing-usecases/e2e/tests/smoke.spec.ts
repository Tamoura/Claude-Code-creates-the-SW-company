import { test, expect } from '@playwright/test';

test.describe('Quantum Computing Use Cases — Smoke Tests', () => {
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

  test('use case cards or content sections are displayed', async ({ page }) => {
    await page.goto('/');

    // The app should display some content (cards, sections, or list items)
    const content = page
      .locator('article, .card, [data-testid="use-case"], li, section')
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
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

    // Vite React app should render a root element with content
    const root = page.locator('#root, main, [data-testid="app"]').first();
    await expect(root).toBeVisible({ timeout: 10000 });
  });
});
