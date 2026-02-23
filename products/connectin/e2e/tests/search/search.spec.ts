import { test, expect } from '../../fixtures';
import { SearchPage } from '../../pages/search.page';

test.describe('Search', () => {
  test('navigates to search page via TopBar', async ({ authenticatedPage: page }) => {
    // TopBar search is a form — type and submit
    const topBarSearch = page.locator('form[role="search"] input[type="search"]');
    await topBarSearch.fill('test');
    await topBarSearch.press('Enter');
    await page.waitForURL(/\/search\?q=test/);
    await expect(page).toHaveURL(/\/search/);
  });

  test('search page loads with query param', async ({ authenticatedPage: page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto('engineer');
    await searchPage.expectLoaded();
    // Should show results or "no results" message
    const hasResults = await page.locator('section[aria-labelledby]').count();
    const hasNoResults = await page.getByText(/no results|لا توجد نتائج/i).isVisible().catch(() => false);
    expect(hasResults > 0 || hasNoResults).toBeTruthy();
  });

  test('search page shows tab filters', async ({ authenticatedPage: page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto('test');
    // Tabs should be present
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    const tabCount = await tabs.count();
    expect(tabCount).toBe(4); // All, People, Posts, Jobs
  });

  test('search with no results shows empty state', async ({ authenticatedPage: page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto('xyznonexistent9999');
    // Should show "no results" message
    await expect(page.getByText(/no results|لا توجد نتائج/i)).toBeVisible({ timeout: 10_000 });
  });
});
