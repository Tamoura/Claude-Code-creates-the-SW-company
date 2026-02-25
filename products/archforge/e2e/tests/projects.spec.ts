import { test, expect, Page } from '@playwright/test';

/**
 * Project management E2E tests.
 *
 * Exercises creating, viewing, and deleting projects through the web UI.
 * Each run generates a unique project name to avoid collisions.
 */

const TEST_USER = {
  email: `e2e-project-${Date.now()}@test.com`,
  password: 'E2eTestPass123!@#',
  fullName: 'E2E Project Tester',
};

const PROJECT_NAME = `Test Project ${Date.now()}`;

async function registerAndLogin(page: Page): Promise<void> {
  // Register via API to speed things up
  const apiBase = 'http://localhost:5012';
  const registerRes = await page.request.post(`${apiBase}/api/v1/auth/register`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      fullName: TEST_USER.fullName,
    },
  });
  expect(registerRes.ok()).toBeTruthy();

  // Login via UI
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(TEST_USER.email);
  await page.getByLabel(/Password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

test.describe('Project Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('create a project from the dashboard', async ({ page }) => {
    await registerAndLogin(page);

    // Look for a "New Project" or "Create Project" button
    const createBtn = page
      .getByRole('button', { name: /new project|create project/i })
      .or(page.getByRole('link', { name: /new project|create project/i }));

    await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
    await createBtn.first().click();

    // Fill in project creation form (modal or page)
    const nameInput = page
      .getByLabel(/name/i)
      .or(page.getByPlaceholder(/project name/i));
    await expect(nameInput.first()).toBeVisible({ timeout: 5000 });
    await nameInput.first().fill(PROJECT_NAME);

    // Select framework if dropdown present
    const frameworkSelect = page.getByLabel(/framework/i);
    if (await frameworkSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await frameworkSelect.selectOption({ index: 1 });
    }

    // Submit
    const submitBtn = page
      .getByRole('button', { name: /create|save|submit/i })
      .last();
    await submitBtn.click();

    // Should see the project name somewhere on the page
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 10000 });
  });

  test('project appears in the project list', async ({ page }) => {
    await registerAndLogin(page);

    // Navigate to dashboard or projects page
    await page.goto('/dashboard');
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 10000 });
  });

  test('click project opens detail page', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/dashboard');

    const projectLink = page.getByText(PROJECT_NAME);
    await expect(projectLink).toBeVisible({ timeout: 10000 });
    await projectLink.click();

    // Should navigate to a project detail page
    await page.waitForURL('**/projects/**', { timeout: 10000 });
    await expect(page.getByText(PROJECT_NAME)).toBeVisible();
  });

  test('delete project with confirmation', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/dashboard');

    // Navigate to the project
    await page.getByText(PROJECT_NAME).click();
    await page.waitForURL('**/projects/**', { timeout: 10000 });

    // Look for delete button (may be in a menu or directly visible)
    const deleteBtn = page
      .getByRole('button', { name: /delete/i })
      .or(page.getByText(/delete project/i));

    if (await deleteBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.first().click();

      // Confirmation dialog - type project name
      const confirmInput = page
        .getByPlaceholder(/project name/i)
        .or(page.getByLabel(/confirm/i));

      if (await confirmInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmInput.first().fill(PROJECT_NAME);
        const confirmBtn = page
          .getByRole('button', { name: /confirm|delete/i })
          .last();
        await confirmBtn.click();
      }

      // Should redirect to dashboard or show project removed
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    }
  });
});
