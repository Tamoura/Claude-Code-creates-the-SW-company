import { test, expect } from '@playwright/test';

test.describe('Dashboard Access', () => {
  test('unauthenticated user accessing dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing dashboard/observe redirects to login', async ({ page }) => {
    await page.goto('/dashboard/observe');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing dashboard/timeline redirects to login', async ({ page }) => {
    await page.goto('/dashboard/timeline');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing dashboard/dimensions redirects to login', async ({ page }) => {
    await page.goto('/dashboard/dimensions');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing dashboard/milestones redirects to login', async ({ page }) => {
    await page.goto('/dashboard/milestones');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing dashboard/settings redirects to login', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing onboarding redirects to login', async ({ page }) => {
    await page.goto('/onboarding');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });

  test('unauthenticated user accessing onboarding/child redirects to login', async ({ page }) => {
    await page.goto('/onboarding/child');

    // Should redirect to login page
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasLoginContent = await page.locator('#email, input[type="email"]').first().isVisible().catch(() => false);
    const isOnLogin = url.includes('/login');

    expect(isOnLogin || hasLoginContent).toBe(true);
  });
});
