import { test, expect } from '../../fixtures';

test.describe('Logout', () => {
  test('logs out and redirects to login', async ({ authenticatedPage: page }) => {
    // Wait for the sidebar to fully load (it's dynamically imported)
    await page.waitForLoadState('networkidle');

    // "Sign Out" button is in the sidebar (desktop) — regex matches text
    const logoutBtn = page.getByRole('button', { name: /sign out/i });
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
