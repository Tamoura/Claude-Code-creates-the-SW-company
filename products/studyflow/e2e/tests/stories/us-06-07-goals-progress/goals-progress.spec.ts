import { test, expect } from '@playwright/test';
import {
  signupNewUser,
  addSubjectToPlan,
  isoDateOffset,
} from '../../../support/helpers';

/**
 * Goals & progress — US-06 (create goal), US-07 (log progress),
 * US-11 (edit/delete recompute). Each test sets up a fresh user with CS101
 * selected, then drives the goal/progress UI.
 *
 * Grounded against the real API: numeric target 10 + value 4 ⇒ 40% completion.
 */
test.describe('US-06/07/11 — Goals & progress', () => {
  test.beforeEach(async ({ page }) => {
    await signupNewUser(page);
    await addSubjectToPlan(page, 'CS101');
    // Open the selected-subject detail (My Plan → View & set goals).
    await page.goto('/subjects');
    await page
      .getByRole('listitem')
      .filter({
        has: page.getByRole('heading', {
          name: 'Introduction to Programming',
        }),
      })
      .getByRole('link', { name: 'View & set goals' })
      .click();
    await expect(page).toHaveURL(/\/subjects\/[0-9a-f-]+$/);
  });

  test('[US-06][AC-1] create a numeric goal (target 10, future due) bound to the subject', async ({
    page,
  }) => {
    await page.getByRole('button', { name: '+ New goal' }).click();

    await page.getByLabel('Goal title').fill('Read 10 chapters');
    await page.getByLabel('Metric type').selectOption('numeric');
    await page.getByLabel('Target').fill('10');
    await page.getByLabel('Due date').fill(isoDateOffset(30));
    await page.getByRole('button', { name: 'Create goal' }).click();

    // The new goal appears with Active status.
    await expect(
      page.getByRole('link', { name: 'Read 10 chapters' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('[US-06][AC-3] a goal with a past due date is rejected (BR-006)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: '+ New goal' }).click();

    await page.getByLabel('Goal title').fill('Backdated goal');
    await page.getByLabel('Target').fill('5');
    await page.getByLabel('Due date').fill(isoDateOffset(-5)); // past
    await page.getByRole('button', { name: 'Create goal' }).click();

    await expect(
      page.getByText('Due date must be in the future')
    ).toBeVisible();
  });

  test('[US-07][AC-1/AC-2] log a progress entry (value 4) → completion recomputes to 40%', async ({
    page,
  }) => {
    // BUG-001 (FIXED): the API now accepts the user's local "today" even when it
    // is one calendar day ahead of UTC, so a user in UTC+ can log progress for
    // their current day. This test enforces the correct 40% behaviour.

    // Create the numeric/target-10 goal.
    await page.getByRole('button', { name: '+ New goal' }).click();
    await page.getByLabel('Goal title').fill('Read 10 chapters');
    await page.getByLabel('Metric type').selectOption('numeric');
    await page.getByLabel('Target').fill('10');
    await page.getByLabel('Due date').fill(isoDateOffset(30));
    await page.getByRole('button', { name: 'Create goal' }).click();

    // Open the goal detail to log progress.
    await page.getByRole('link', { name: 'Read 10 chapters' }).click();
    await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);

    // Log value 4 against target 10 ⇒ 40%.
    await page.getByLabel('Value').fill('4');
    await page.getByRole('button', { name: 'Log progress' }).click();

    // The completion progressbar reads 40%.
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
      { timeout: 10_000 }
    );
  });

  test('[US-07][AC-3] a future-dated progress entry is rejected (C-8)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: '+ New goal' }).click();
    await page.getByLabel('Goal title').fill('Future entry goal');
    await page.getByLabel('Target').fill('10');
    await page.getByLabel('Due date').fill(isoDateOffset(30));
    await page.getByRole('button', { name: 'Create goal' }).click();

    await page.getByRole('link', { name: 'Future entry goal' }).click();
    await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);

    await page.getByLabel('Value').fill('1');
    // Force a future date past the input `max` guard.
    await page.getByLabel('Date').fill(isoDateOffset(5));
    await page.getByRole('button', { name: 'Log progress' }).click();

    await expect(
      page.getByText('Date cannot be in the future')
    ).toBeVisible();
  });

  test('[US-11][AC-2] deleting a goal removes it (cascade), Selection survives', async ({
    page,
  }) => {
    await page.getByRole('button', { name: '+ New goal' }).click();
    await page.getByLabel('Goal title').fill('Temporary goal');
    await page.getByLabel('Target').fill('3');
    await page.getByLabel('Due date').fill(isoDateOffset(20));
    await page.getByRole('button', { name: 'Create goal' }).click();
    await expect(
      page.getByRole('link', { name: 'Temporary goal' })
    ).toBeVisible({ timeout: 10_000 });

    // Delete from the goal row; confirm the window.confirm dialog.
    page.once('dialog', (d) => void d.accept());
    const row = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: 'Temporary goal' }) });
    await row.getByRole('button', { name: 'Delete' }).click();

    // After the only goal is deleted, the page recomputes to the empty state.
    await expect(page.getByText('No goals yet')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('link', { name: 'Temporary goal' })
    ).toHaveCount(0);
    // The subject (Selection) is still present on its detail page.
    await expect(
      page.getByRole('heading', { name: 'Introduction to Programming' })
    ).toBeVisible();
  });
});
