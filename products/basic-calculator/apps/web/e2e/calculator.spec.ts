import { test, expect } from '@playwright/test';

test.describe('Calculator E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display calculator on page load', async ({ page }) => {
    await expect(page.getByTestId('calculator-display')).toBeVisible();
    await expect(page.getByTestId('calculator-display')).toHaveText('0');
  });

  test('should perform basic addition: 5 + 3 = 8', async ({ page }) => {
    await page.click('text=5');
    await page.click('text=+');
    await page.click('text=3');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('8');
  });

  test('should perform basic subtraction: 10 - 4 = 6', async ({ page }) => {
    await page.click('text=1');
    await page.click('text=0');
    await page.click('text=−');
    await page.click('text=4');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('6');
  });

  test('should perform basic multiplication: 7 * 6 = 42', async ({ page }) => {
    await page.click('text=7');
    await page.click('text=×');
    await page.click('text=6');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('42');
  });

  test('should perform basic division: 15 / 3 = 5', async ({ page }) => {
    await page.click('text=1');
    await page.click('text=5');
    await page.click('text=÷');
    await page.click('text=3');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('5');
  });

  test('should handle decimal numbers: 3.14 + 2.86 = 6', async ({ page }) => {
    await page.click('text=3');
    await page.click('text=.');
    await page.click('text=1');
    await page.click('text=4');
    await page.click('text=+');
    await page.click('text=2');
    await page.click('text=.');
    await page.click('text=8');
    await page.click('text=6');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('6');
  });

  test('should fix floating point precision: 0.1 + 0.2 = 0.3', async ({ page }) => {
    await page.click('text=0');
    await page.click('text=.');
    await page.click('text=1');
    await page.click('text=+');
    await page.click('text=0');
    await page.click('text=.');
    await page.click('text=2');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('0.3');
  });

  test('should clear display with C button', async ({ page }) => {
    await page.click('text=5');
    await page.click('text=3');
    await page.click('text=7');
    await page.click('text=C');

    await expect(page.getByTestId('calculator-display')).toHaveText('0');
  });

  test('should display error on division by zero', async ({ page }) => {
    await page.click('text=5');
    await page.click('text=÷');
    await page.click('text=0');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toContainText('Error');
    await expect(page.getByTestId('calculator-display')).toContainText('divide by zero');
  });

  test('should recover from error on number input', async ({ page }) => {
    // Trigger error
    await page.click('text=5');
    await page.click('text=÷');
    await page.click('text=0');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toContainText('Error');

    // Press a number to recover
    await page.click('text=3');
    await expect(page.getByTestId('calculator-display')).toHaveText('3');
  });

  test('should support keyboard input: 5+3=8', async ({ page }) => {
    await page.keyboard.type('5+3');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('calculator-display')).toHaveText('8');
  });

  test('should support keyboard Escape to clear', async ({ page }) => {
    await page.keyboard.type('537');
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('calculator-display')).toHaveText('0');
  });

  test('should chain operations: 5 + 3 - 2 = 6', async ({ page }) => {
    await page.click('text=5');
    await page.click('text=+');
    await page.click('text=3');
    await page.click('text=−'); // Should calculate 5+3=8
    await page.click('text=2');
    await page.click('text==');

    await expect(page.getByTestId('calculator-display')).toHaveText('6');
  });

  // Visual verification tests
  test('should have visible and styled buttons', async ({ page }) => {
    const button = page.getByLabelText('Five');
    await expect(button).toBeVisible();

    // Check button has background color (not transparent)
    const bgColor = await button.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should have visible display with proper styling', async ({ page }) => {
    const display = page.getByTestId('calculator-display');
    await expect(display).toBeVisible();

    // Check display has background color
    const bgColor = await display.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should be mobile responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('calculator-display')).toBeVisible();

    const button = page.getByLabelText('Five');
    await expect(button).toBeVisible();

    // Verify button is large enough for touch (44x44px minimum)
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('calculator-display')).toBeVisible();

    // Test a calculation still works
    await page.click('text=5');
    await page.click('text=+');
    await page.click('text=3');
    await page.click('text==');
    await expect(page.getByTestId('calculator-display')).toHaveText('8');
  });
});
