import { test, expect } from '../../fixtures';
import { JobsPage } from '../../pages/jobs.page';

test.describe('Jobs', () => {
  test('loads jobs page', async ({ authenticatedPage: page }) => {
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();
    await jobsPage.expectLoaded();
  });

  test('displays job listings from seed data', async ({ authenticatedPage: page }) => {
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();
    const jobCount = await jobsPage.getJobCount();
    expect(jobCount).toBeGreaterThan(0);
  });

  test('shows apply button on job listing', async ({ authenticatedPage: page }) => {
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();
    // Apply button should be visible on at least one job
    const applyBtn = page.getByRole('button', { name: /apply|تقدم/i }).first();
    await expect(applyBtn).toBeVisible({ timeout: 8_000 });
  });

  test('shows save job button', async ({ authenticatedPage: page }) => {
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();
    const saveBtn = page.getByRole('button', { name: /save|حفظ/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 8_000 });
  });
});
