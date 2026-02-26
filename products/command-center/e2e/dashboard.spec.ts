import { test, expect } from '@playwright/test';

test.describe('Overview Page', () => {
  test('loads and shows company command center', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h1')).toContainText('Company Command Center');
    await expect(page.locator('main')).toContainText('ConnectSW AI Software Company');
  });

  test('displays KPI stat cards', async ({ page }) => {
    await page.goto('/overview');
    const main = page.locator('main');
    await expect(main.locator('text=Products').first()).toBeVisible();
    await expect(main.locator('text=AI Agents').first()).toBeVisible();
    await expect(main.locator('text=Avg Quality Score')).toBeVisible();
    await expect(main.locator('text=Open Alerts')).toBeVisible();
  });

  test('shows phase distribution section', async ({ page }) => {
    await page.goto('/overview');
    const main = page.locator('main');
    await expect(main.locator('h2:has-text("Phase Distribution")')).toBeVisible();
    await expect(main.locator('text=Foundation').first()).toBeVisible();
  });

  test('shows active alerts section', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h2:has-text("Active Alerts")')).toBeVisible();
  });

  test('shows recent commits section', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h2:has-text("Recent Commits")')).toBeVisible();
  });

  test('shows product health matrix', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('main h2:has-text("Product Health Matrix")')).toBeVisible();
  });
});

test.describe('Health Scorecard Page', () => {
  test('loads and shows health scorecard', async ({ page }) => {
    await page.goto('/health');
    await expect(page.locator('main h1')).toContainText('Product Health Scorecard');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/health');
    const main = page.locator('main');
    await expect(main.locator('text=Total Products')).toBeVisible();
    await expect(main.locator('text=With Tests')).toBeVisible();
    await expect(main.locator('text=/Active.*7d/')).toBeVisible();
    await expect(main.locator('text=Total Files').first()).toBeVisible();
  });

  test('shows product health table with data', async ({ page }) => {
    await page.goto('/health');
    const main = page.locator('main');
    await expect(main.locator('th:has-text("Product")')).toBeVisible();
    await expect(main.locator('th:has-text("Phase")')).toBeVisible();
    await expect(main.locator('th:has-text("Tests")')).toBeVisible();
    await expect(main.locator('tbody tr').first()).toBeVisible();
  });

  test('product rows link to product detail', async ({ page }) => {
    await page.goto('/health');
    const firstRow = page.locator('main tbody tr').first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/products\//);
  });
});

test.describe('Alert Center Page', () => {
  test('loads and shows alert center', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('main h1')).toContainText('Alert Center');
    await expect(page.locator('main')).toContainText('System alerts and notifications');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/alerts');
    const main = page.locator('main');
    await expect(main.locator('text=Critical Alerts')).toBeVisible();
    await expect(main.locator('text=Warnings')).toBeVisible();
    await expect(main.locator('text=Info').first()).toBeVisible();
  });

  test('shows filter tabs', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('main button:has-text("All")')).toBeVisible();
  });

  test('shows empty state when no alerts', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('main')).toContainText('All clear');
  });
});

test.describe('Approval Queue Page', () => {
  test('loads and shows Approval Queue h1', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.locator('main h1')).toContainText('Approval Queue');
  });

  test('displays stat cards for Pending, Approved, Rejected', async ({ page }) => {
    await page.goto('/approvals');
    const main = page.locator('main');
    await expect(main.locator('text=Pending').first()).toBeVisible();
    await expect(main.locator('text=Approved').first()).toBeVisible();
    await expect(main.locator('text=Rejected').first()).toBeVisible();
  });

  test('shows filter tabs All, Pending, Resolved', async ({ page }) => {
    await page.goto('/approvals');
    const main = page.locator('main');
    await expect(main.locator('button:has-text("All")')).toBeVisible();
    await expect(main.locator('button', { hasText: /Pending/ })).toBeVisible();
    await expect(main.locator('button', { hasText: /Resolved/ })).toBeVisible();
  });

  test('pending items have a Review button', async ({ page }) => {
    await page.goto('/approvals');
    // Default tab is "Pending" — at least one seed item should be pending
    const reviewBtn = page.locator('main button:has-text("Review")');
    await expect(reviewBtn.first()).toBeVisible();
  });

  test('clicking Review shows Approve, Reject buttons and note textarea', async ({ page }) => {
    await page.goto('/approvals');
    const reviewBtn = page.locator('main button:has-text("Review")').first();
    await reviewBtn.click();
    const main = page.locator('main');
    await expect(main.locator('button:has-text("Approve")')).toBeVisible();
    await expect(main.locator('button:has-text("Reject")')).toBeVisible();
    await expect(main.locator('textarea')).toBeVisible();
  });
});

test.describe('PR Dashboard Page', () => {
  test('loads and shows PR Dashboard h1', async ({ page }) => {
    await page.goto('/pr-dashboard');
    await expect(page.locator('main h1')).toContainText('PR Dashboard');
  });

  test('displays stat cards Open PRs, Needs Review, CI Failures, Approved, Draft, Total', async ({
    page,
  }) => {
    await page.goto('/pr-dashboard');
    const main = page.locator('main');
    await expect(main.locator('text=Open PRs').first()).toBeVisible();
    await expect(main.locator('text=Needs Review').first()).toBeVisible();
    await expect(main.locator('text=CI Failures').first()).toBeVisible();
    await expect(main.locator('text=Approved').first()).toBeVisible();
    await expect(main.locator('text=Draft').first()).toBeVisible();
    // "Total" appears as "Total (open+closed)"
    await expect(main.locator('text=/Total/').first()).toBeVisible();
  });

  test('shows filter tabs Open and Recently Closed', async ({ page }) => {
    await page.goto('/pr-dashboard');
    const main = page.locator('main');
    await expect(main.locator('button', { hasText: /Open/ })).toBeVisible();
    await expect(main.locator('button', { hasText: /Recently Closed/ })).toBeVisible();
  });

  test('shows CI filter buttons All CI, Failing, Pending', async ({ page }) => {
    await page.goto('/pr-dashboard');
    const main = page.locator('main');
    await expect(main.locator('button:has-text("All CI")')).toBeVisible();
    await expect(main.locator('button:has-text("Failing")')).toBeVisible();
    await expect(main.locator('button:has-text("Pending")')).toBeVisible();
  });
});
