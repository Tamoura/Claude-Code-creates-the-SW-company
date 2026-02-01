import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';
const TEST_EMAIL = `e2e-security-${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPassword123!@#';

test.describe('Security Page', () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API_URL}/v1/auth/signup`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('security page shows user email', async ({ page }) => {
    await page.goto('/dashboard/security');
    await expect(page.locator(`text=${TEST_EMAIL}`)).toBeVisible();
  });

  test('change password button toggles form', async ({ page }) => {
    await page.goto('/dashboard/security');

    const changeBtn = page.locator('button', { hasText: 'Change Password' });
    await expect(changeBtn).toBeVisible();
    await changeBtn.click();

    // Password form should appear
    await expect(page.locator('input[placeholder*="Current"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="New"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Confirm"]')).toBeVisible();

    // Cancel should hide it
    const cancelBtn = page.locator('button', { hasText: 'Cancel' });
    await cancelBtn.click();
    await expect(page.locator('input[placeholder*="Current"]')).not.toBeVisible();
  });

  test('show sessions toggle works', async ({ page }) => {
    await page.goto('/dashboard/security');

    const showBtn = page.locator('button', { hasText: 'Show Sessions' });
    await expect(showBtn).toBeVisible();
    await showBtn.click();

    // Should show current session
    await expect(page.locator('text=Current Session')).toBeVisible();

    // Hide
    const hideBtn = page.locator('button', { hasText: 'Hide Sessions' });
    await hideBtn.click();
    await expect(page.locator('text=Current Session')).not.toBeVisible();
  });

  test('sign out in danger zone works', async ({ page }) => {
    await page.goto('/dashboard/security');

    // The Sign Out button in the danger zone
    const signOutBtn = page.locator('.rounded-xl').filter({ hasText: 'Danger Zone' }).locator('button', { hasText: 'Sign Out' });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
  });
});
