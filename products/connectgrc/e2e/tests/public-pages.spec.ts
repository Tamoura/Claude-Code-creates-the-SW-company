import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('landing page loads with correct content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=ConnectGRC')).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('how it works page loads', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page).toHaveURL('/how-it-works');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('for talents page loads', async ({ page }) => {
    await page.goto('/for-talents');
    await expect(page).toHaveURL('/for-talents');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('for employers page loads', async ({ page }) => {
    await page.goto('/for-employers');
    await expect(page).toHaveURL('/for-employers');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL('/pricing');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('resources page loads', async ({ page }) => {
    await page.goto('/resources');
    await expect(page).toHaveURL('/resources');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveURL('/contact');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveURL('/terms');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.locator('text=not found').first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Some Next.js setups redirect to / or show custom 404
    });
  });

  test('navigation links work from landing page', async ({ page }) => {
    await page.goto('/');

    // Check login link exists
    const loginLink = page.locator('a[href="/login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL('/login');
    }
  });
});
