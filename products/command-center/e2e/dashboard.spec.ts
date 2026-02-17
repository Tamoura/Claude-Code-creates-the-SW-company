import { test, expect } from '@playwright/test';

test.describe('Overview Page', () => {
  test('loads and shows executive overview', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h1')).toContainText('Executive Overview');
    await expect(page.locator('main')).toContainText('ConnectSW company health at a glance');
  });

  test('displays stat cards with data', async ({ page }) => {
    await page.goto('/overview');
    const main = page.locator('main');
    await expect(main.locator('text=Products').first()).toBeVisible();
    await expect(main.locator('text=Shared Packages')).toBeVisible();
    await expect(main.locator('text=AI Agents')).toBeVisible();
    await expect(main.locator('text=Total Files')).toBeVisible();
  });

  test('shows product phases section', async ({ page }) => {
    await page.goto('/overview');
    const main = page.locator('main');
    await expect(main.locator('h2:has-text("Product Phases")')).toBeVisible();
    await expect(main.locator('text=Foundation').first()).toBeVisible();
  });

  test('shows recent activity section', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h2:has-text("Recent Activity")')).toBeVisible();
  });

  test('shows recent commits section', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h2:has-text("Recent Commits")')).toBeVisible();
  });
});

test.describe('Health Scorecard Page', () => {
  test('loads and shows health scorecard', async ({ page }) => {
    await page.goto('/health');
    await expect(page.locator('main h1')).toContainText('Product Health Scorecard');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/health');
    const main = page.locator('main');
    await expect(main.locator('text=Total Products')).toBeVisible();
    await expect(main.locator('text=With Tests')).toBeVisible();
    await expect(main.locator('text=/Active.*7d/')).toBeVisible();
    await expect(main.locator('text=Total Files').first()).toBeVisible();
  });

  test('shows product health table with data', async ({ page }) => {
    await page.goto('/health');
    const main = page.locator('main');
    await expect(main.locator('th:has-text("Product")')).toBeVisible();
    await expect(main.locator('th:has-text("Phase")')).toBeVisible();
    await expect(main.locator('th:has-text("Tests")')).toBeVisible();
    await expect(main.locator('tbody tr').first()).toBeVisible();
  });

  test('product rows link to product detail', async ({ page }) => {
    await page.goto('/health');
    const firstRow = page.locator('main tbody tr').first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/products\//);
  });
});

test.describe('Alert Center Page', () => {
  test('loads and shows alert center', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('main h1')).toContainText('Alert Center');
    await expect(page.locator('main')).toContainText('System alerts and notifications');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/alerts');
    const main = page.locator('main');
    await expect(main.locator('text=Critical Alerts')).toBeVisible();
    await expect(main.locator('text=Warnings')).toBeVisible();
    await expect(main.locator('text=Info').first()).toBeVisible();
  });

  test('shows filter tabs', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('main button:has-text("All")')).toBeVisible();
  });

  test('shows empty state when no alerts', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('main')).toContainText('All clear');
  });
});
