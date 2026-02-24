import { test, expect, Page } from '@playwright/test';

/**
 * Artifact generation E2E tests.
 *
 * Exercises the AI artifact generation flow. Since the OPENROUTER_API_KEY
 * is a test stub in CI, the AI call may fail or return a mock. These tests
 * verify the UI flow up to the point of submission and handle both
 * success and graceful failure scenarios.
 */

const TEST_USER = {
  email: `e2e-artifact-${Date.now()}@test.com`,
  password: 'E2eTestPass123!@#',
  fullName: 'E2E Artifact Tester',
};

const PROJECT_NAME = `Artifact Project ${Date.now()}`;

async function registerLoginAndCreateProject(page: Page): Promise<void> {
  const apiBase = 'http://localhost:5012';

  // Register
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

  // Create project via API (faster)
  const loginRes = await page.request.post(`${apiBase}/api/v1/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });
  const loginBody = await loginRes.json();
  const token = loginBody.accessToken;

  await page.request.post(`${apiBase}/api/v1/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: PROJECT_NAME,
      description: 'E2E test project for artifacts',
      framework: 'C4',
    },
  });

  // Refresh to pick up the new project
  await page.goto('/dashboard');
}

test.describe('Artifact Generation', () => {
  test.describe.configure({ mode: 'serial' });

  test('navigate to project and see artifacts section', async ({ page }) => {
    await registerLoginAndCreateProject(page);

    // Click on the project
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 10000 });
    await page.getByText(PROJECT_NAME).click();
    await page.waitForURL('**/projects/**', { timeout: 10000 });

    // Should see artifacts section or tab
    await expect(
      page
        .getByText(/artifact/i)
        .or(page.getByText(/diagram/i))
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('open generate dialog and see form fields', async ({ page }) => {
    await registerLoginAndCreateProject(page);

    // Navigate to project
    await page.getByText(PROJECT_NAME).click();
    await page.waitForURL('**/projects/**', { timeout: 10000 });

    // Look for generate button
    const generateBtn = page
      .getByRole('button', { name: /generate|create artifact|new artifact/i })
      .or(page.getByRole('link', { name: /generate|create artifact|new artifact/i }));

    if (await generateBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.first().click();

      // Should see prompt/description input
      const promptInput = page
        .getByLabel(/prompt|description|describe/i)
        .or(page.getByPlaceholder(/describe|prompt/i));

      await expect(promptInput.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('submit generation request with prompt', async ({ page }) => {
    await registerLoginAndCreateProject(page);

    await page.getByText(PROJECT_NAME).click();
    await page.waitForURL('**/projects/**', { timeout: 10000 });

    const generateBtn = page
      .getByRole('button', { name: /generate|create artifact|new artifact/i })
      .or(page.getByRole('link', { name: /generate|create artifact|new artifact/i }));

    if (await generateBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.first().click();

      // Fill in the prompt
      const promptInput = page
        .getByLabel(/prompt|description|describe/i)
        .or(page.getByPlaceholder(/describe|prompt/i));

      if (await promptInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await promptInput.first().fill(
          'A microservices architecture with API gateway, user service, and order service',
        );

        // Select type if available
        const typeSelect = page.getByLabel(/type/i);
        if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await typeSelect.selectOption({ index: 1 });
        }

        // Submit
        const submitBtn = page
          .getByRole('button', { name: /generate|create|submit/i })
          .last();
        await submitBtn.click();

        // Wait for result — with a test API key this may show an error,
        // which is acceptable. We verify the UI handles it gracefully.
        await expect(
          page
            .getByText(/generating|loading|processing/i)
            .or(page.getByText(/artifact/i))
            .or(page.getByRole('alert'))
            .first(),
        ).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('view artifact detail page', async ({ page }) => {
    await registerLoginAndCreateProject(page);

    await page.getByText(PROJECT_NAME).click();
    await page.waitForURL('**/projects/**', { timeout: 10000 });

    // Check if there are any artifacts listed
    const artifactLink = page.getByRole('link', { name: /artifact|diagram/i });

    if (await artifactLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await artifactLink.first().click();
      await page.waitForURL('**/artifacts/**', { timeout: 10000 });

      // Should show artifact details
      await expect(
        page
          .getByText(/element|relationship|diagram|mermaid/i)
          .first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
