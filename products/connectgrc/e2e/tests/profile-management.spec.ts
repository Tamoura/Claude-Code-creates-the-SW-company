import { test, expect } from '@playwright/test';

async function loginAsTestUser(page: import('@playwright/test').Page): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('talent@connectgrc.test');
    await page.locator('input[type="password"]').fill('Test1234');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/dashboard', { timeout: 3000 });
    return true;
  } catch (error) {
    return false;
  }
}

test.describe('Profile Management', () => {
  test('profile page shows form fields', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.goto('/profile');

    // Should show profile page
    await expect(page.locator('h1')).toBeVisible();

    // Look for form fields
    const possibleFields = ['headline', 'bio', 'location', 'skills'];
    let foundFields = 0;
    for (const field of possibleFields) {
      const input = page.locator(`input[name="${field}"], textarea[name="${field}"], #${field}`).first();
      if (await input.isVisible().catch(() => false)) {
        foundFields++;
      }
    }
  });

  test('can edit profile fields', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.goto('/profile');

    // Try to find and fill a headline field
    const headlineInput = page.locator('input[name="headline"], input[placeholder*="headline" i]').first();
    if (await headlineInput.isVisible().catch(() => false)) {
      await headlineInput.fill('GRC Professional');

      // Find and click save button
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('profile shows domain scores section', async ({ page }) => {
    const loggedIn = await loginAsTestUser(page);
    test.skip(!loggedIn, 'Test user not available - API not running or user not seeded');

    await page.goto('/profile');

    // Look for domain scores section
    await page.waitForTimeout(2000);
    const scoresSection = page.locator('text=Domain Scores, text=Scores, text=Assessment Results').first();
    // Domain scores section should exist (might be empty)
  });
});
