import { test, expect } from '../../fixtures';
import { ProfilePage } from '../../pages/profile.page';

test.describe('Profile', () => {
  test('loads own profile page', async ({ authenticatedPage: page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.expectLoaded();
  });

  test('shows edit profile button on own profile', async ({ authenticatedPage: page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    const editBtn = page.getByRole('button', { name: /edit profile|تعديل/i });
    await expect(editBtn).toBeVisible();
  });

  test('can edit headline', async ({ authenticatedPage: page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    const newHeadline = `Senior Engineer @ ConnectIn ${Date.now()}`;
    await profilePage.editHeadline(newHeadline);
    // Headline should update on the page
    await expect(page.getByText(newHeadline)).toBeVisible({ timeout: 8_000 });
  });
});
