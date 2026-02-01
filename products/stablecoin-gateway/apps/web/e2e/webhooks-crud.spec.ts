import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5001';
const TEST_EMAIL = `e2e-webhooks-${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPassword123!@#';

test.describe('Webhooks CRUD', () => {
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

  test('Webhooks page loads', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    await expect(page.locator('h2, h3').filter({ hasText: /webhook/i })).toBeVisible();
  });

  test('can navigate to webhooks and see add button', async ({ page }) => {
    await page.goto('/dashboard/webhooks');

    const addBtn = page.locator('button', { hasText: /add|create/i });
    await expect(addBtn).toBeVisible();
  });
});
