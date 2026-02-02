import { test, expect, navigateTo } from './fixtures/auth.fixture';

test.describe('Invoices', () => {

  test('invoices page loads with header', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/invoices');

    await expect(authedPage.locator('h2', { hasText: 'Invoices' })).toBeVisible();
    await expect(authedPage.getByText('Completed payment invoices')).toBeVisible();
  });

  test('invoices table has correct column headers', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/invoices');

    await expect(authedPage.locator('th', { hasText: 'Invoice' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Customer' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Date' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Amount' })).toBeVisible();
    await expect(authedPage.locator('th', { hasText: 'Status' })).toBeVisible();
  });

  test('empty state shows helpful message', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/invoices');

    // New accounts have no completed payments, so empty state should show
    const emptyMsg = authedPage.getByText('No completed payments yet');
    const table = authedPage.locator('table');

    const hasRows = await table.locator('tbody tr td:not([colspan])').count() > 0;
    if (!hasRows) {
      await expect(emptyMsg).toBeVisible();
    }
  });

  test('invoices page accessible from sidebar', async ({ authedPage }) => {
    // Start on dashboard, then navigate via sidebar
    const invoicesLink = authedPage.locator('nav a', { hasText: 'Invoices' });
    await expect(invoicesLink).toBeVisible();
    await invoicesLink.click();

    await expect(authedPage.locator('h2', { hasText: 'Invoices' })).toBeVisible();
  });
});
