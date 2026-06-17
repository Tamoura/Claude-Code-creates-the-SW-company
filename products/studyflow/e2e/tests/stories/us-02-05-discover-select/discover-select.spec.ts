import { test, expect } from '@playwright/test';
import { signupNewUser, addSubjectToPlan } from '../../../support/helpers';

/**
 * Discover & select — US-02 (browse/search), US-03 (compare via detail),
 * US-04 (add to plan), US-05 (manual custom subject).
 * Every test starts from a fresh account so plans never collide.
 */
test.describe('US-02/03/04/05 — Discover & select', () => {
  test.beforeEach(async ({ page }) => {
    await signupNewUser(page);
  });

  test('[US-02][AC-1] catalog lists seeded subjects with code/name/credits', async ({
    page,
  }) => {
    await page.goto('/catalog');
    await expect(
      page.getByRole('heading', { name: 'Subject catalog' })
    ).toBeVisible();

    // Seeded catalog has 12 subjects incl. CS101.
    const cards = page.getByRole('listitem');
    await expect(cards.first()).toBeVisible();
    await expect(page.getByText('CS101', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Introduction to Programming')
    ).toBeVisible();
  });

  test('[US-02][AC-2] searching by code filters the list', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByLabel('Search subjects').fill('MATH101');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText('MATH101', { exact: true })).toBeVisible();
    // A non-matching seeded code should no longer be on screen.
    await expect(page.getByText('CS101', { exact: true })).toHaveCount(0);
  });

  test('[US-02][AC-4] a search with no matches shows an empty state, not a blank page', async ({
    page,
  }) => {
    await page.goto('/catalog');
    await page.getByLabel('Search subjects').fill('zzz-no-such-subject-xyz');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText('No subjects found')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add a custom subject' })
    ).toBeVisible();
  });

  test('[US-02][AC-3] opening a subject shows its full detail', async ({
    page,
  }) => {
    await page.goto('/catalog');
    await page.getByLabel('Search subjects').fill('CS101');
    await page.getByRole('button', { name: 'Search' }).click();

    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByText('CS101', { exact: true }) })
      .first();
    await card.getByRole('link', { name: 'View details' }).click();

    await expect(page).toHaveURL(/\/catalog\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: 'Introduction to Programming' })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('[US-04][AC-1] add a catalog subject to the plan → it appears in My Plan', async ({
    page,
  }) => {
    await addSubjectToPlan(page, 'CS101');

    await page.goto('/subjects');
    await expect(
      page.getByRole('heading', { name: 'My plan' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Introduction to Programming' })
    ).toBeVisible();
  });

  test('[US-04][AC-2] adding the same subject twice is rejected (no duplicate selection)', async ({
    page,
  }) => {
    await addSubjectToPlan(page, 'CS101');

    // Try again from the catalog — UI should report it is already in the plan.
    await page.goto('/catalog');
    await page.getByLabel('Search subjects').fill('CS101');
    await page.getByRole('button', { name: 'Search' }).click();
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByText('CS101', { exact: true }) })
      .first();
    await card.getByRole('button', { name: 'Add to my plan' }).click();

    await expect(card.getByText('Already in your plan.')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('[US-05][AC-1] manually add a custom subject → auto-selected into My Plan', async ({
    page,
  }) => {
    const name = `Quantum Basket Weaving ${Date.now()}`;
    await page.goto('/subjects');

    await page.getByRole('button', { name: '+ Add custom subject' }).click();
    await page.getByLabel('Subject name').fill(name);
    await page.getByLabel('Code (optional)').fill('QBW999');
    await page.getByLabel('Credits (optional)').fill('3');
    await page.getByRole('button', { name: 'Add subject' }).click();

    // Auto-creates a Selection for the active term — appears in My Plan.
    await expect(page.getByRole('heading', { name })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('QBW999')).toBeVisible();
  });

  test('[US-05][AC-1] custom subject form requires a name (negative)', async ({
    page,
  }) => {
    await page.goto('/subjects');
    await page.getByRole('button', { name: '+ Add custom subject' }).click();
    // Submit with empty name.
    await page.getByRole('button', { name: 'Add subject' }).click();
    await expect(page.getByText('Subject name is required')).toBeVisible();
  });
});
