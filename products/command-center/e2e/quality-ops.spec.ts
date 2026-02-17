import { test, expect } from '@playwright/test';

test.describe('Quality Gates Page', () => {
  test('loads and shows quality gate dashboard', async ({ page }) => {
    await page.goto('/quality-gates');
    await expect(page.locator('main h1')).toContainText('Quality Gate Dashboard');
    await expect(page.locator('main')).toContainText('Code quality scores');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/quality-gates');
    const main = page.locator('main');
    await expect(main.locator('text=Products Audited')).toBeVisible();
    await expect(main.locator('text=Avg Score')).toBeVisible();
    await expect(main.locator('text=Passing')).toBeVisible();
  });

  test('shows product quality cards', async ({ page }) => {
    await page.goto('/quality-gates');
    await expect(page.locator('main').locator('text=command-center').first()).toBeVisible();
  });
});

test.describe('Audit Reports Page', () => {
  test('loads and shows audit reports', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.locator('main h1')).toContainText('Audit Reports');
    await expect(page.locator('main')).toContainText('Activity tracking');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/audit');
    const main = page.locator('main');
    await expect(main.locator('text=Total Entries')).toBeVisible();
    await expect(main.locator('text=Unique Agents')).toBeVisible();
    await expect(main.locator('text=Products Tracked')).toBeVisible();
    await expect(main.locator('text=Success Rate')).toBeVisible();
  });

  test('shows filter controls', async ({ page }) => {
    await page.goto('/audit');
    const selects = page.locator('main select');
    await expect(selects.first()).toBeVisible();
  });

  test('shows audit timeline entries', async ({ page }) => {
    await page.goto('/audit');
    // Timeline heading should be visible with audit entries
    await expect(page.locator('main h2:has-text("Timeline")')).toBeVisible({ timeout: 10000 });
  });

  test('shows breakdown charts', async ({ page }) => {
    await page.goto('/audit');
    const main = page.locator('main');
    await expect(main.locator('text=By Agent')).toBeVisible();
    await expect(main.locator('text=By Product')).toBeVisible();
    await expect(main.locator('text=By Status')).toBeVisible();
  });

  test('filter by agent works', async ({ page }) => {
    await page.goto('/audit');
    const agentSelect = page.locator('main select').first();
    await agentSelect.selectOption({ index: 1 });
    // Page should update without crashing
    await expect(page.locator('main h1')).toContainText('Audit Reports');
  });
});

test.describe('Sprint Board Page', () => {
  test('loads and shows sprint board', async ({ page }) => {
    await page.goto('/sprint');
    await expect(page.locator('main h1')).toContainText('Sprint Board');
    await expect(page.locator('main')).toContainText('Track tasks');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/sprint');
    const main = page.locator('main');
    await expect(main.locator('text=Total Tasks')).toBeVisible();
    await expect(main.locator('text=Pending').first()).toBeVisible();
    await expect(main.locator('text=In Progress').first()).toBeVisible();
    await expect(main.locator('text=Completed').first()).toBeVisible();
  });

  test('shows kanban columns', async ({ page }) => {
    await page.goto('/sprint');
    const main = page.locator('main');
    // Kanban column headers contain count in parentheses
    await expect(main.locator('text=/Pending \\(/')).toBeVisible();
    await expect(main.locator('text=/In Progress \\(/')).toBeVisible();
    await expect(main.locator('text=/Done \\(/')).toBeVisible();
  });

  test('shows filter controls', async ({ page }) => {
    await page.goto('/sprint');
    const selects = page.locator('main select');
    await expect(selects.first()).toBeVisible();
  });
});

test.describe('Agent Monitor Page', () => {
  test('loads and shows agent monitor', async ({ page }) => {
    await page.goto('/monitor');
    await expect(page.locator('main h1')).toContainText('Live Agent Monitor');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/monitor');
    const main = page.locator('main');
    await expect(main.locator('text=Total Jobs')).toBeVisible();
    await expect(main.locator('text=Running').first()).toBeVisible();
    await expect(main.locator('text=Completed').first()).toBeVisible();
    await expect(main.locator('text=Failed').first()).toBeVisible();
  });

  test('shows pause/resume polling button', async ({ page }) => {
    await page.goto('/monitor');
    const btn = page.locator('main button:has-text("Pause"), main button:has-text("Resume")');
    await expect(btn.first()).toBeVisible();
  });

  test('can toggle polling', async ({ page }) => {
    await page.goto('/monitor');
    const pauseBtn = page.locator('main button:has-text("Pause")');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await expect(page.locator('main button:has-text("Resume")')).toBeVisible();
    }
  });
});
