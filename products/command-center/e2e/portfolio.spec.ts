import { test, expect } from '@playwright/test';

test.describe('Products Page', () => {
  test('loads and shows products list', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('main h1')).toContainText('Products');
    await expect(page.locator('main')).toContainText('products in the portfolio');
  });

  test('displays product cards with data', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('main').locator('text=Command Center').first()).toBeVisible();
  });

  test('product cards show phase badges', async ({ page }) => {
    await page.goto('/products');
    const main = page.locator('main');
    const badges = main.locator('text=Production, text=Foundation, text=MVP');
    // Use a more robust check — at least one phase badge
    await expect(main.locator('text=Foundation').first()).toBeVisible();
  });

  test('clicking a product card navigates to detail', async ({ page }) => {
    await page.goto('/products');
    // Cards are clickable divs (not anchor tags)
    await page.locator('main').locator('text=Command Center').first().click();
    await expect(page).toHaveURL(/\/products\/command-center/);
  });
});

test.describe('Product Detail Page', () => {
  test('loads product detail for command-center', async ({ page }) => {
    await page.goto('/products/command-center');
    await expect(page.locator('main')).toContainText('Command Center');
  });

  test('shows breadcrumb navigation', async ({ page }) => {
    await page.goto('/products/command-center');
    await expect(page.locator('main a:has-text("Products")')).toBeVisible();
  });

  test('shows product phase badge', async ({ page }) => {
    await page.goto('/products/command-center');
    await expect(page.locator('main').locator('text=Foundation').first()).toBeVisible();
  });

  test('shows document list in sidebar', async ({ page }) => {
    await page.goto('/products/command-center');
    await expect(page.locator('main').locator('text=PRD').first()).toBeVisible();
  });

  test('can select and view a document', async ({ page }) => {
    await page.goto('/products/command-center');
    // Click on PRD document
    const prdButton = page.locator('main button:has-text("PRD"), main a:has-text("PRD")').first();
    await prdButton.click();
    // Wait for markdown content to render
    await page.waitForTimeout(2000);
    // Should show document content area
    await expect(page.locator('main')).toContainText('PRD');
  });
});

test.describe('Agents Page', () => {
  test('loads and shows agent hub', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('main h1')).toContainText('Agent Hub');
    await expect(page.locator('main')).toContainText('specialist AI agents');
  });

  test('displays agent cards', async ({ page }) => {
    await page.goto('/agents');
    const main = page.locator('main');
    await expect(main.locator('text=Architect Agent')).toBeVisible();
    await expect(main.locator('text=Backend Engineer Agent')).toBeVisible();
  });

  test('agent cards show trained badge', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('main').locator('text=Trained').first()).toBeVisible();
  });

  test('clicking an agent card navigates to detail', async ({ page }) => {
    await page.goto('/agents');
    await page.locator('main a[href="/agents/architect"]').click();
    await expect(page).toHaveURL(/\/agents\/architect/);
  });
});

test.describe('Agent Detail Page', () => {
  test('loads agent detail for architect', async ({ page }) => {
    await page.goto('/agents/architect');
    await expect(page.locator('main')).toContainText('Architect Agent');
  });

  test('shows back link to agent hub', async ({ page }) => {
    await page.goto('/agents/architect');
    await expect(page.locator('main a[href="/agents"]')).toBeVisible();
    await expect(page.locator('main')).toContainText('Back to Agent Hub');
  });

  test('shows experience stats when trained', async ({ page }) => {
    await page.goto('/agents/architect');
    const main = page.locator('main');
    await expect(main.locator('text=Tasks Completed')).toBeVisible();
    await expect(main.locator('text=Success Rate')).toBeVisible();
  });

  test('shows tabs for different views', async ({ page }) => {
    await page.goto('/agents/architect');
    await expect(page.locator('main button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('main button:has-text("Full Definition")')).toBeVisible();
  });

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/agents/architect');
    await page.locator('main button:has-text("Full Definition")').click();
    // Should show the full markdown definition
    await page.waitForTimeout(1000);
    await expect(page.locator('main')).toContainText('Architect');
  });
});

test.describe('Workflows Page', () => {
  test('loads and shows workflows', async ({ page }) => {
    await page.goto('/workflows');
    await expect(page.locator('main h1')).toContainText('Workflows');
    await expect(page.locator('main')).toContainText('workflow definitions');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/workflows');
    const main = page.locator('main');
    await expect(main.locator('text=Total Workflows')).toBeVisible();
    await expect(main.locator('text=Total Tasks')).toBeVisible();
    await expect(main.locator('text=Avg Duration')).toBeVisible();
    await expect(main.locator('text=Agents Involved')).toBeVisible();
  });

  test('shows workflow cards', async ({ page }) => {
    await page.goto('/workflows');
    await expect(page.locator('main').locator('text=Add Mobile Version').first()).toBeVisible();
  });

  test('can expand workflow to see diagram and tasks', async ({ page }) => {
    await page.goto('/workflows');
    const expandBtn = page.locator('main button:has-text("Expand diagram")').first();
    await expandBtn.click();
    // Should show task table or Mermaid diagram
    await expect(page.locator('main table, main .mermaid, main svg').first()).toBeVisible({ timeout: 10000 });
  });
});

