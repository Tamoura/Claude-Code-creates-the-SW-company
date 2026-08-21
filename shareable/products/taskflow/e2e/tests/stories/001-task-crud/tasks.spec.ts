import { expect, test } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Regression E2E for the task lifecycle. Article X: a feature is not done
 * until it has been driven through a real browser. Each test names the
 * requirement it covers so the traceability check can find it.
 */
test.describe('task lifecycle', () => {
  test.beforeAll(async ({ request }) => {
    // The board writes into the first project, so make sure one exists.
    const projects = await (await request.get(`${API_URL}/api/v1/projects`)).json();
    if (projects.projects.length === 0) {
      await request.post(`${API_URL}/api/v1/projects`, { data: { name: 'E2E' } });
    }
  });

  test('adds, advances and deletes a task [US-04][US-05][AC-18]', async ({ page }) => {
    const title = `E2E task ${Date.now()}`;

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible();

    await page.getByLabel('New task title').fill(title);
    await page.getByRole('button', { name: 'Add task' }).click();

    const row = page.getByRole('listitem').filter({ hasText: title });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: `Advance ${title}` }).click();
    await expect(row.getByRole('button', { name: `Advance ${title}` })).toHaveText('In progress');

    await row.getByRole('button', { name: `Delete ${title}` }).click();
    await expect(row).toHaveCount(0);
  });

  test('surfaces API errors instead of failing silently [US-05][AC-19]', async ({ page }) => {
    await page.route('**/api/v1/tasks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          body: JSON.stringify({ title: 'Request body failed validation', status: 422 }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page.getByLabel('New task title').fill('Doomed task');
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(page.getByRole('alert')).toContainText('failed validation');
  });
});
