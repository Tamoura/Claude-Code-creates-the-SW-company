import { test, expect } from '@playwright/test';

test.describe('GPU Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads without errors', async ({ page }) => {
    // Check page title or header
    await expect(page.locator('header')).toBeVisible();

    // No console errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('calculate button is visible and styled', async ({ page }) => {
    const button = page.getByRole('button', { name: /calculate/i });

    // Button should be visible
    await expect(button).toBeVisible();

    // Button should have proper styling (not invisible)
    const bgColor = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have a background color (not transparent)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
  });

  test('form inputs have visible borders', async ({ page }) => {
    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible();

    const borderWidth = await input.evaluate((el) => {
      return window.getComputedStyle(el).borderWidth;
    });

    // Input should have a border (not 0px)
    expect(borderWidth).not.toBe('0px');
  });

  test('form inputs accept values', async ({ page }) => {
    const modelInput = page.locator('#modelSizeB');
    await expect(modelInput).toBeVisible();

    await modelInput.clear();
    await modelInput.fill('13');

    await expect(modelInput).toHaveValue('13');
  });

  test('calculate button triggers calculation', async ({ page }) => {
    // Fill form with valid values
    await page.locator('#modelSizeB').fill('7');
    await page.locator('#datasetSizeGb').fill('100');
    await page.locator('#epochs').fill('3');

    // Click calculate
    const button = page.getByRole('button', { name: /calculate/i });
    await button.click();

    // Should show results (or loading state)
    // Wait for either results or error
    await expect(
      page.getByText(/results|calculating|error/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('tab navigation works', async ({ page }) => {
    // Should have tabs
    const trainingTab = page.getByRole('tab', { name: /training/i });
    const inferenceTab = page.getByRole('tab', { name: /inference/i });

    await expect(trainingTab).toBeVisible();
    await expect(inferenceTab).toBeVisible();

    // Training tab should be selected by default
    await expect(trainingTab).toHaveAttribute('aria-selected', 'true');

    // Click inference tab
    await inferenceTab.click();

    // Inference tab should now be selected
    await expect(inferenceTab).toHaveAttribute('aria-selected', 'true');

    // Should show inference coming soon message
    await expect(page.getByText(/coming soon/i)).toBeVisible();
  });

  test('responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Form should still be visible
    await expect(page.locator('form')).toBeVisible();

    // Button should still be visible
    const button = page.getByRole('button', { name: /calculate/i });
    await expect(button).toBeVisible();
  });
});
