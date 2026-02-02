import { test, expect } from './fixtures/auth.fixture';

test.describe('Dashboard', () => {

  test('dashboard shows stat cards', async ({ authedPage }) => {
    await expect(authedPage.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Stat cards should be visible (Total Balance, Settlement Volume, Success Rate)
    const statCards = authedPage.locator('.rounded-xl').filter({ has: authedPage.locator('.text-2xl') });
    await expect(statCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('dashboard shows recent transactions table', async ({ authedPage }) => {
    await expect(authedPage.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Transactions table or "No transactions" message
    const table = authedPage.locator('table');
    const emptyMsg = authedPage.locator('text=No transactions');
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyMsg.isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test('dashboard has sidebar navigation', async ({ authedPage }) => {
    const sidebar = authedPage.locator('aside');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/payments"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/invoices"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/api-keys"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/webhooks"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/security"]')).toBeVisible();
  });

  test('dashboard has View All button linking to payments', async ({ authedPage }) => {
    const viewAllBtn = authedPage.locator('button', { hasText: 'View All' });
    await expect(viewAllBtn).toBeVisible();
    await viewAllBtn.click();
    await expect(authedPage).toHaveURL(/\/dashboard\/payments/);
  });
});
