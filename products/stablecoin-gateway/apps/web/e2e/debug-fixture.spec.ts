import { test, expect } from './fixtures/auth.fixture';

test('fixture: authedPage lands on dashboard', async ({ authedPage }) => {
  await expect(authedPage).toHaveURL(/\/dashboard/);
  await expect(authedPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
});
