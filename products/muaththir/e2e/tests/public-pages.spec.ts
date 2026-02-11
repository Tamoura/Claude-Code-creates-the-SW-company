import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('landing page loads and displays key content', async ({ page }) => {
    await page.goto('/');

    // Page title or main heading should be visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Navigation links should be present (use .first() since nav + body may both have links)
    const loginLink = page.locator('a[href="/login"]').first();
    const signupLink = page.locator('a[href="/signup"]').first();

    await expect(loginLink).toBeVisible();
    await expect(signupLink).toBeVisible();
  });

  test('navigation works across public pages', async ({ page }) => {
    await page.goto('/');

    // Navigate to pricing
    const pricingLink = page.locator('a[href="/pricing"]').first();
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await expect(page).toHaveURL('/pricing');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }

    // Navigate to about
    await page.goto('/about');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('pricing page displays pricing information', async ({ page }) => {
    await page.goto('/pricing');

    // Should show some pricing content
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Should have CTA buttons to sign up
    const ctaButton = page.locator('a[href="/signup"], button:has-text("Get Started")');
    await expect(ctaButton.first()).toBeVisible();
  });

  test('about page displays company information', async ({ page }) => {
    await page.goto('/about');

    // Should display main heading
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');

    // Should display privacy policy content
    await expect(page.locator('h1:has-text("Privacy"), h2:has-text("Privacy")').first()).toBeVisible({ timeout: 10000 });
  });

  test('terms of service page loads', async ({ page }) => {
    await page.goto('/terms');

    // Should display terms content
    await expect(page.locator('h1:has-text("Terms"), h2:has-text("Terms")').first()).toBeVisible({ timeout: 10000 });
  });
});
