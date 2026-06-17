import { test, expect } from '@playwright/test';
import {
  signupNewUser,
  addSubjectToPlan,
  isoDateOffset,
} from '../../../support/helpers';

/**
 * Dashboard & tracking — US-08 (completion %/streak) and US-10 (unified
 * dashboard). This is the MONEY PATH: it walks the full loop in one test —
 * signup → select subject → create goal → log progress → assert the dashboard
 * reflects total goals, the goal at 40% completion, a streak, and the subject.
 *
 * Grounded against the real API: numeric target 10 + value 4 ⇒ 40%, streak 1,
 * aggregate { totalGoals: 1, overallCompletionPct: 40 }.
 */
test.describe('US-08/10 — Dashboard & full loop', () => {
  test('[US-10][AC-2] a brand-new dashboard shows the guiding empty state', async ({
    page,
  }) => {
    await signupNewUser(page);
    await page.goto('/dashboard');
    // US-10 AC-2 — never a blank/error page for a new user.
    await expect(page.getByText("Let's set up your term")).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Browse the catalog' })
    ).toBeVisible();
  });

  test('[US-08][AC-1][US-10][AC-1] full loop: select → goal → progress → dashboard reflects 40%', async ({
    page,
  }, testInfo) => {
    // BUG-001 (FIXED): logging progress through the UI sends the user's local
    // "today", which the API now accepts (one-day UTC grace). The full money path
    // reaches 40% end-to-end. This test enforces it as a hard green.

    // 1. Account + subject.
    await signupNewUser(page);
    await addSubjectToPlan(page, 'CS101');

    // 2. Open the selected subject and create a numeric goal (target 10).
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

    await page.getByRole('button', { name: '+ New goal' }).click();
    await page.getByLabel('Goal title').fill('Read 10 chapters');
    await page.getByLabel('Metric type').selectOption('numeric');
    await page.getByLabel('Target').fill('10');
    await page.getByLabel('Due date').fill(isoDateOffset(30));
    await page.getByRole('button', { name: 'Create goal' }).click();
    await expect(
      page.getByRole('link', { name: 'Read 10 chapters' })
    ).toBeVisible({ timeout: 10_000 });

    // 3. Log progress value 4 ⇒ 40% completion, streak 1.
    await page.getByRole('link', { name: 'Read 10 chapters' }).click();
    await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);
    await page.getByLabel('Value').fill('4');
    await page.getByRole('button', { name: 'Log progress' }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
      { timeout: 10_000 }
    );

    // 4. Dashboard reflects the whole loop (US-10 AC-1).
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();

    // Aggregate stat cards: Total goals = 1, Overall completion = 40%.
    await expect(
      page.getByText('Total goals').locator('xpath=..')
    ).toContainText('1');
    await expect(
      page.getByText('Overall completion').locator('xpath=..')
    ).toContainText('40%');

    // The active goal card shows the goal at 40% and a streak.
    const goalCard = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: 'Read 10 chapters' }) });
    await expect(goalCard).toBeVisible();
    await expect(goalCard.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40'
    );
    await expect(goalCard.getByText(/🔥\s*1\s*streak/)).toBeVisible();

    // The subject card is present in "My subjects".
    await expect(
      page
        .getByRole('link', { name: 'Introduction to Programming' })
        .first()
    ).toBeVisible();

    // Proof artifact for the money path.
    const shot = testInfo.outputPath('dashboard-full-loop-40pct.png');
    await page.screenshot({ path: shot, fullPage: true });
    await testInfo.attach('dashboard-full-loop', {
      path: shot,
      contentType: 'image/png',
    });
  });

  test('[US-10][AC-3] clicking a dashboard goal navigates to its detail', async ({
    page,
  }) => {
    // Build minimal state: account + subject + goal.
    await signupNewUser(page);
    await addSubjectToPlan(page, 'CS101');
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
    await page.getByLabel('Goal title').fill('Navigate me');
    await page.getByLabel('Target').fill('5');
    await page.getByLabel('Due date').fill(isoDateOffset(15));
    await page.getByRole('button', { name: 'Create goal' }).click();
    await expect(
      page.getByRole('link', { name: 'Navigate me' })
    ).toBeVisible({ timeout: 10_000 });

    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Navigate me' }).first().click();
    await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);
    await expect(
      page.getByRole('heading', { name: 'Navigate me' })
    ).toBeVisible();
  });
});
