import { test, expect } from '@playwright/test';

test.describe('Activity Page', () => {
  test('loads and shows activity feed', async ({ page }) => {
    await page.goto('/activity');
    await expect(page.locator('main h1')).toContainText('Activity Feed');
    await expect(page.locator('main')).toContainText('Audit trail and commit history');
  });

  test('shows activity items', async ({ page }) => {
    await page.goto('/activity');
    // Should show commit messages or audit entries
    await expect(page.locator('main').locator('text=command-center').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Git Analytics Page', () => {
  test('loads and shows git analytics', async ({ page }) => {
    await page.goto('/git-analytics');
    await expect(page.locator('main h1')).toContainText('Git Analytics');
    await expect(page.locator('main')).toContainText('Last 30 days');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/git-analytics');
    const main = page.locator('main');
    await expect(main.locator('text=Total Commits')).toBeVisible();
    await expect(main.locator('text=Lines Added')).toBeVisible();
    await expect(main.locator('text=Lines Deleted')).toBeVisible();
    await expect(main.locator('text=Active Contributors')).toBeVisible();
  });

  test('shows commit heatmap', async ({ page }) => {
    await page.goto('/git-analytics');
    // Heatmap has day labels
    await expect(page.locator('main').locator('text=Mon').first()).toBeVisible();
  });

  test('shows by-product and by-type charts', async ({ page }) => {
    await page.goto('/git-analytics');
    const main = page.locator('main');
    await expect(main.locator('text=By Product')).toBeVisible();
    await expect(main.locator('text=By Type')).toBeVisible();
  });
});

test.describe('Knowledge Base Page', () => {
  test('loads and shows knowledge base', async ({ page }) => {
    await page.goto('/knowledge');
    await expect(page.locator('main h1')).toContainText('Knowledge Base');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/knowledge');
    const main = page.locator('main');
    await expect(main.locator('text=Patterns').first()).toBeVisible();
    await expect(main.locator('text=Agent Experiences').first()).toBeVisible();
  });

  test('shows search input', async ({ page }) => {
    await page.goto('/knowledge');
    const searchInput = page.locator('main input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('shows tabs for categories', async ({ page }) => {
    await page.goto('/knowledge');
    const main = page.locator('main');
    await expect(main.getByRole('button', { name: 'Patterns', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Anti-Patterns' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Gotchas' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Agent Experiences' })).toBeVisible();
  });

  test('can switch tabs', async ({ page }) => {
    await page.goto('/knowledge');
    await page.locator('main').getByRole('button', { name: 'Anti-Patterns' }).click();
    await expect(page.locator('main').getByRole('button', { name: 'Anti-Patterns' })).toHaveClass(/border-b/);
  });

  test('search filters results without crashing', async ({ page }) => {
    await page.goto('/knowledge');
    const searchInput = page.locator('main input[placeholder*="Search"]');
    await searchInput.fill('Vite');
    await page.waitForTimeout(1000);
    // Page should not crash — h1 still visible
    await expect(page.locator('main h1')).toContainText('Knowledge Base');
  });
});

test.describe('Components Page', () => {
  test('loads and shows component library', async ({ page }) => {
    await page.goto('/components');
    await expect(page.locator('main h1')).toContainText('Component Library');
    await expect(page.locator('main')).toContainText('@connectsw');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/components');
    const main = page.locator('main');
    await expect(main.locator('text=Packages').first()).toBeVisible();
    await expect(main.locator('text=Total Files').first()).toBeVisible();
    await expect(main.locator('text=With Prisma')).toBeVisible();
  });

  test('shows packages table', async ({ page }) => {
    await page.goto('/components');
    await expect(page.locator('main table').first()).toBeVisible();
    await expect(page.locator('main').locator('text=@connectsw/audit')).toBeVisible();
    await expect(page.locator('main').locator('text=@connectsw/auth')).toBeVisible();
  });
});

test.describe('Infrastructure Page', () => {
  test('loads and shows infrastructure', async ({ page }) => {
    await page.goto('/infrastructure');
    await expect(page.locator('main h1')).toContainText('Infrastructure');
    await expect(page.locator('main')).toContainText('Ports, CI/CD pipelines');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/infrastructure');
    const main = page.locator('main');
    await expect(main.locator('text=Frontend Ports')).toBeVisible();
    await expect(main.locator('text=Backend Ports')).toBeVisible();
    await expect(main.locator('text=CI Pipelines')).toBeVisible();
  });

  test('shows port assignments', async ({ page }) => {
    await page.goto('/infrastructure');
    await expect(page.locator('main').locator('text=3113').first()).toBeVisible();
  });
});

test.describe('Operations Page', () => {
  test('loads and shows operations guide', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('main h1')).toContainText('Operations Guide');
    await expect(page.locator('main')).toContainText('operate and manage');
  });

  test('shows sidebar navigation', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('main').locator('text=Contents')).toBeVisible();
  });

  test('shows operation sections with content', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('main h2').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Invoke Page', () => {
  test('loads and shows invoke terminal', async ({ page }) => {
    await page.goto('/invoke');
    await expect(page.locator('main h1')).toContainText('Invoke');
    await expect(page.locator('main')).toContainText('Run commands');
  });

  test('shows command input', async ({ page }) => {
    await page.goto('/invoke');
    const input = page.locator('main input[placeholder*="Enter command"]');
    await expect(input).toBeVisible();
  });

  test('shows quick command presets', async ({ page }) => {
    await page.goto('/invoke');
    const main = page.locator('main');
    await expect(main.locator('button:has-text("Status Update")')).toBeVisible();
    await expect(main.locator('button:has-text("Recent Commits")')).toBeVisible();
    await expect(main.locator('button:has-text("Branch List")')).toBeVisible();
  });

  test('run button is disabled when input is empty', async ({ page }) => {
    await page.goto('/invoke');
    const runBtn = page.locator('main button:has-text("Run")');
    await expect(runBtn).toBeDisabled();
  });

  test('preset fills command input', async ({ page }) => {
    await page.goto('/invoke');
    await page.locator('main button:has-text("Status Update")').click();
    const input = page.locator('main input[placeholder*="Enter command"]');
    await expect(input).not.toHaveValue('');
  });

  test('can run a git status command', async ({ page }) => {
    await page.goto('/invoke');
    const input = page.locator('main input[placeholder*="Enter command"]');
    await input.fill('git status');
    const runBtn = page.locator('main button:has-text("Run")');
    await expect(runBtn).toBeEnabled();
    await runBtn.click();
    // Should show terminal output or completed status
    await expect(page.locator('main').locator('text=completed').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Settings Page', () => {
  test('loads and shows settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('main h1')).toContainText('Settings');
    await expect(page.locator('main')).toContainText('System info');
  });

  test('shows system info', async ({ page }) => {
    await page.goto('/settings');
    const main = page.locator('main');
    await expect(main.locator('text=Version')).toBeVisible();
    await expect(main.locator('text=Total Products')).toBeVisible();
    await expect(main.locator('text=Total Agents')).toBeVisible();
  });

  test('shows tabs for registries', async ({ page }) => {
    await page.goto('/settings');
    const main = page.locator('main');
    await expect(main.locator('button:has-text("Port Registry")')).toBeVisible();
    await expect(main.locator('button:has-text("Agent Registry")')).toBeVisible();
    await expect(main.locator('button:has-text("Product Registry")')).toBeVisible();
  });

  test('can switch between registry tabs', async ({ page }) => {
    await page.goto('/settings');
    await page.locator('main button:has-text("Agent Registry")').click();
    await expect(page.locator('main').locator('text=Architect').first()).toBeVisible();
  });

  test('port registry tab shows port data', async ({ page }) => {
    await page.goto('/settings');
    await page.locator('main button:has-text("Port Registry")').click();
    await expect(page.locator('main').locator('text=command-center').first()).toBeVisible();
  });
});
