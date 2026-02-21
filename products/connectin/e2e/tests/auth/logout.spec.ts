import { test, expect } from '../../fixtures';

test.describe('Logout', () => {
  test('logs out and redirects to login or landing', async ({ authenticatedPage: page }) => {
    // Find and click logout — could be in a menu or sidebar
    const logoutBtn = page.getByRole('button', { name: /logout|sign out|خروج/i }).or(
      page.getByRole('link', { name: /logout|sign out|خروج/i })
    );

    // Open user menu if logout is nested
    const userMenu = page.getByRole('button', { name: /account|profile|menu/i }).or(
      page.locator('[data-testid="user-menu"]')
    );

    if (await userMenu.count() > 0) {
      await userMenu.first().click();
    }

    await logoutBtn.first().click();
    await expect(page).toHaveURL(/\/(login|home|$)/, { timeout: 8_000 });
  });
});
