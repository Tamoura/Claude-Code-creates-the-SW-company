import { test, expect, navigateTo } from './fixtures/auth.fixture';

test.describe('Security Page', () => {

  test('security page shows user email', async ({ authedPage, authedUser }) => {
    await navigateTo(authedPage, '/dashboard/security');
    await expect(authedPage.locator(`text=${authedUser.email}`)).toBeVisible();
  });

  test('change password button toggles form', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/security');

    const changeBtn = authedPage.locator('button', { hasText: 'Change Password' });
    await expect(changeBtn).toBeVisible();
    await changeBtn.click();

    await expect(authedPage.locator('input[placeholder*="Current"]')).toBeVisible();
    await expect(authedPage.locator('input[placeholder*="New"]')).toBeVisible();
    await expect(authedPage.locator('input[placeholder*="Confirm"]')).toBeVisible();

    const cancelBtn = authedPage.locator('button', { hasText: 'Cancel' });
    await cancelBtn.click();
    await expect(authedPage.locator('input[placeholder*="Current"]')).not.toBeVisible();
  });

  test('show sessions toggle works', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/security');

    const showBtn = authedPage.locator('button', { hasText: 'Show Sessions' });
    await expect(showBtn).toBeVisible();
    await showBtn.click();

    // Sessions panel shows device name "Current Session" (regex for case-sensitive match)
    const sessionText = authedPage.locator('p', { hasText: /^Current Session/ });
    await expect(sessionText).toBeVisible({ timeout: 5000 });

    const hideBtn = authedPage.locator('button', { hasText: 'Hide Sessions' });
    await hideBtn.click();
    await expect(sessionText).not.toBeVisible();
  });

  test('sign out in danger zone works', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/security');

    const signOutBtn = authedPage.locator('.rounded-xl').filter({ hasText: 'Danger Zone' }).locator('button', { hasText: 'Sign Out' });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    await authedPage.waitForURL('**/login', { timeout: 5000 });
  });
});
