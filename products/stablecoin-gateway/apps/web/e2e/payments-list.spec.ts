import { test, expect, navigateTo } from './fixtures/auth.fixture';

test.describe('Payments List', () => {

  test('payments page loads with header and table', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/payments');

    await expect(authedPage.locator('h2', { hasText: 'Payment History' })).toBeVisible();
    await expect(authedPage.locator('table')).toBeVisible();
  });

  test('payments table has correct column headers', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/payments');

    await expect(authedPage.locator('th', { hasText: 'ID' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Customer' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Date' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Amount' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Asset' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Status' })).toBeVisible();
  });

  test('filter buttons are visible and clickable', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/payments');

    const allBtn = authedPage.getByRole('button', { name: 'All', exact: true });
    const completedBtn = authedPage.locator('button', { hasText: 'Completed' });
    const pendingBtn = authedPage.locator('button', { hasText: 'Pending' });
    const failedBtn = authedPage.locator('button', { hasText: 'Failed' });

    await expect(allBtn).toBeVisible();
    await expect(completedBtn).toBeVisible();
    await expect(pendingBtn).toBeVisible();
    await expect(failedBtn).toBeVisible();

    // Click each filter — page should not error
    await completedBtn.click();
    await pendingBtn.click();
    await failedBtn.click();
    await allBtn.click();
  });

  test('empty state shows no transactions message', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/payments');

    // New accounts have no transactions, so empty state should show
    // (unless prior tests created payments — check for table or empty message)
    const table = authedPage.locator('table');
    const emptyMsg = authedPage.getByText('No transactions yet');

    // Either the table has rows or the empty message is shown
    const hasRows = await table.locator('tbody tr').count() > 0;
    if (!hasRows) {
      await expect(emptyMsg).toBeVisible();
    }
  });

  test('filter to Completed shows only completed or empty', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/payments');

    await authedPage.locator('button', { hasText: 'Completed' }).click();

    // After filtering, all visible status badges should be SUCCESS or table is empty
    const statusBadges = authedPage.locator('tbody span.rounded-full');
    const count = await statusBadges.count();

    for (let i = 0; i < count; i++) {
      const text = await statusBadges.nth(i).textContent();
      expect(text?.toLowerCase()).toContain('success');
    }
  });
});
