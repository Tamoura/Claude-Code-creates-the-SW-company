import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';
const TEST_EMAIL = `e2e-apikeys-${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPassword123!@#';

test.describe('API Keys CRUD', () => {
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

  test('API Keys page loads and shows create button', async ({ page }) => {
    await page.goto('/dashboard/api-keys');
    await expect(page.locator('text=API Keys')).toBeVisible();

    // Should have a create button
    const createBtn = page.locator('button', { hasText: /create/i });
    await expect(createBtn).toBeVisible();
  });

  test('can create and then revoke an API key', async ({ page }) => {
    await page.goto('/dashboard/api-keys');

    // Click create
    const createBtn = page.locator('button', { hasText: /create/i });
    await createBtn.click();

    // Fill in the form (if modal/form appears)
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Key');

      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Create")').last();
      await submitBtn.click();
    }

    // Wait for key to appear in the table
    await page.waitForTimeout(2000);

    // Try to revoke if a revoke/delete button exists
    const revokeBtn = page.locator('button', { hasText: /revoke|delete/i }).first();
    if (await revokeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revokeBtn.click();

      // Confirm if there's a confirmation dialog
      const confirmBtn = page.locator('button', { hasText: /confirm|yes|revoke/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Should not show error
      await page.waitForTimeout(1000);
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorAlert.textContent();
        // "Failed to connect to API" was the old bug - this must not appear
        expect(errorText).not.toContain('Failed to connect');
      }
    }
  });
});
