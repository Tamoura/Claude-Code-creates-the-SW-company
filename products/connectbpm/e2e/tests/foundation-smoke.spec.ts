import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:5018';

test.describe('foundation smoke', () => {
  test('the API health endpoint answers', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    // 503 is a legitimate answer when Postgres is down; a hang or a 500 is not.
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('database');
  });

  test('the web app renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ConnectBPM' })).toBeVisible();
  });
});
