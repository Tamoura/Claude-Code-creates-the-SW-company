import { test, expect } from '@playwright/test';
import {
  signupNewUser,
  addSubjectToPlan,
  isoDateOffset,
} from '../../../support/helpers';

/**
 * Selection edges — US-04 AC-3 (removing a selection that has goals is blocked,
 * 409 → "delete its goals first", per C-7) and US-13 (advisory prerequisite
 * warning is non-blocking; selection still succeeds).
 */
test.describe('US-04/13 — Selection edges', () => {
  test('[US-04][AC-3] removing a subject that has goals is blocked (409, delete goals first)', async ({
    page,
  }) => {
    await signupNewUser(page);
    await addSubjectToPlan(page, 'CS101');

    // Add a goal so the selection has a dependent.
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
    await page.getByRole('button', { name: '+ New goal' }).click();
    await page.getByLabel('Goal title').fill('Blocker goal');
    await page.getByLabel('Target').fill('5');
    await page.getByLabel('Due date').fill(isoDateOffset(20));
    await page.getByRole('button', { name: 'Create goal' }).click();
    await expect(
      page.getByRole('link', { name: 'Blocker goal' })
    ).toBeVisible({ timeout: 10_000 });

    // Back to My Plan; try to remove the subject — must be blocked.
    await page.goto('/subjects');
    const row = page.getByRole('listitem').filter({
      has: page.getByRole('heading', {
        name: 'Introduction to Programming',
      }),
    });
    await row.getByRole('button', { name: 'Remove' }).click();

    // C-7: a warning alert lists the dependent goal and the subject stays.
    await expect(page.getByText(/Delete its goals first/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('heading', { name: 'Introduction to Programming' })
    ).toBeVisible();
  });

  test('[US-13][AC-1/AC-3] selecting a subject with unmet prerequisites warns but still succeeds', async ({
    page,
  }) => {
    await signupNewUser(page);

    // CS201 (Data Structures) requires CS101, which is NOT selected ⇒ advisory
    // prereq warning. addSubjectToPlan auto-accepts the confirm() dialog.
    let dialogSeen = false;
    page.on('dialog', (d) => {
      if (/unmet prerequisites/i.test(d.message())) dialogSeen = true;
    });

    await addSubjectToPlan(page, 'CS201', { acceptPrereq: true });

    // The advisory warning fired (US-13 AC-1) and, after acknowledging, the
    // selection still appears in My Plan (US-13 AC-3, BR-007 non-blocking).
    expect(dialogSeen).toBe(true);
    await page.goto('/subjects');
    await expect(
      page.getByRole('heading', { name: 'Data Structures & Algorithms' })
    ).toBeVisible({ timeout: 10_000 });
  });
});
