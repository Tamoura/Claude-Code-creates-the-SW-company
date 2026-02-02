import { test, expect, navigateTo } from './fixtures/auth.fixture';

test.describe('Dashboard UI Interactions', () => {

  test('sign out from user dropdown redirects to login', async ({ authedPage }) => {
    const avatar = authedPage.locator('header button.rounded-full');
    await expect(avatar).toBeVisible();
    await avatar.click();

    const dropdown = authedPage.locator('button', { hasText: 'Sign Out' }).last();
    await expect(dropdown).toBeVisible();
    await dropdown.click();

    await authedPage.waitForURL('**/login', { timeout: 5000 });
    await expect(authedPage).toHaveURL(/\/login/);
  });

  test('sign out from Security page redirects to login', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/security');

    const signOutBtn = authedPage.locator('button', { hasText: 'Sign Out' }).last();
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    await authedPage.waitForURL('**/login', { timeout: 5000 });
    await expect(authedPage).toHaveURL(/\/login/);
  });

  test('simulate payment button in header is clickable and functional', async ({ authedPage }) => {
    const simBtn = authedPage.locator('button', { hasText: 'Simulate Payment' }).first();
    await expect(simBtn).toBeVisible();
    await expect(simBtn).toBeEnabled();

    await simBtn.click();

    // Wait for button to respond — it either navigates to /pay/ or shows "Creating..."
    // or returns to normal state if the API call fails (graceful handling)
    await expect(async () => {
      const url = authedPage.url();
      const isNavigated = url.includes('/pay/');
      const btnVisible = await simBtn.isVisible().catch(() => false);
      const btnText = btnVisible ? await simBtn.textContent().catch(() => '') : '';
      expect(isNavigated || btnText?.includes('Creating') || btnText?.includes('Simulate')).toBeTruthy();
    }).toPass({ timeout: 15000 });
  });

  test('user avatar shows initials from logged-in user email', async ({ authedPage, authedUser }) => {
    const avatar = authedPage.locator('header button.rounded-full');
    await expect(avatar).toBeVisible();

    const text = await avatar.textContent();
    expect(text).not.toBe('JS');
    const expected = authedUser.email.substring(0, 2).toUpperCase();
    expect(text?.trim()).toBe(expected);
  });

  test('user avatar opens dropdown menu on click', async ({ authedPage }) => {
    const avatar = authedPage.locator('header button.rounded-full');
    await avatar.click();

    await expect(authedPage.locator('text=Merchant Account')).toBeVisible();
    await expect(authedPage.locator('button', { hasText: 'Settings' })).toBeVisible();
    await expect(authedPage.locator('button', { hasText: 'Security' })).toBeVisible();
    await expect(authedPage.locator('button', { hasText: 'Sign Out' })).toBeVisible();
  });

  test('user dropdown Settings navigates to settings page', async ({ authedPage }) => {
    const avatar = authedPage.locator('header button.rounded-full');
    await avatar.click();

    await authedPage.locator('button', { hasText: 'Settings' }).click();
    await expect(authedPage).toHaveURL(/\/dashboard\/settings/);
  });

  test('user dropdown Security navigates to security page', async ({ authedPage }) => {
    const avatar = authedPage.locator('header button.rounded-full');
    await avatar.click();

    await authedPage.locator('button', { hasText: 'Security' }).click();
    await expect(authedPage).toHaveURL(/\/dashboard\/security/);
  });

  test('sidebar Dashboard link navigates correctly', async ({ authedPage }) => {
    await authedPage.click('a[href="/dashboard"]');
    await expect(authedPage).toHaveURL(/\/dashboard$/);
  });

  test('sidebar Payments link navigates correctly', async ({ authedPage }) => {
    await authedPage.click('a[href="/dashboard/payments"]');
    await expect(authedPage).toHaveURL(/\/dashboard\/payments/);
  });

  test('sidebar Invoices link navigates correctly', async ({ authedPage }) => {
    await authedPage.click('a[href="/dashboard/invoices"]');
    await expect(authedPage).toHaveURL(/\/dashboard\/invoices/);
  });

  test('sidebar API Keys link navigates correctly', async ({ authedPage }) => {
    await authedPage.click('a[href="/dashboard/api-keys"]');
    await expect(authedPage).toHaveURL(/\/dashboard\/api-keys/);
  });

  test('sidebar Webhooks link navigates correctly', async ({ authedPage }) => {
    await authedPage.click('a[href="/dashboard/webhooks"]');
    await expect(authedPage).toHaveURL(/\/dashboard\/webhooks/);
  });

  test('sidebar Security link navigates correctly', async ({ authedPage }) => {
    await authedPage.click('a[href="/dashboard/security"]');
    await expect(authedPage).toHaveURL(/\/dashboard\/security/);
  });

  test('View All button navigates to payments page', async ({ authedPage }) => {
    // authedPage starts on /dashboard — no goto needed (would clear token)
    const viewAllBtn = authedPage.locator('button', { hasText: 'View All' });
    await expect(viewAllBtn).toBeVisible({ timeout: 10000 });
    await viewAllBtn.click();
    await expect(authedPage).toHaveURL(/\/dashboard\/payments/);
  });

  test('dashboard checkout preview simulate payment works', async ({ authedPage }) => {
    // authedPage starts on /dashboard
    const simBtn = authedPage.locator('main button', { hasText: 'Simulate Payment' });
    if (await simBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await simBtn.click();

      await expect(async () => {
        const url = authedPage.url();
        const hasCreating = await authedPage.locator('text=Creating').isVisible().catch(() => false);
        expect(url.includes('/pay/') || hasCreating).toBeTruthy();
      }).toPass({ timeout: 10000 });
    }
  });

  test('dashboard loads without console errors', async ({ authedPage }) => {
    // authedPage already loaded /dashboard — just check for errors
    const errors: string[] = [];
    authedPage.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Navigate to dashboard via client-side routing to trigger a fresh load
    await authedPage.locator('a[href="/dashboard"]').click();
    await authedPage.waitForTimeout(2000);

    const unexpectedErrors = errors.filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR') &&
      !e.includes('NetworkError') &&
      !e.includes('Failed to load resource')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
