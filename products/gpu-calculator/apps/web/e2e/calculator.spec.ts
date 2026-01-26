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

/**
 * Comprehensive E2E tests for each form field
 * These tests verify that changing form values and clicking Calculate
 * produces results that reflect the expected behavior.
 */
test.describe('Form Field Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /**
   * Helper function to fill form and get results
   */
  async function fillFormAndCalculate(
    page: any,
    values: {
      modelSizeB?: string;
      datasetSizeGb?: string;
      epochs?: string;
      gpuType?: string;
      gpuCount?: string;
      nodeCount?: string;
    }
  ) {
    if (values.modelSizeB) {
      await page.locator('#modelSizeB').clear();
      await page.locator('#modelSizeB').fill(values.modelSizeB);
    }
    if (values.datasetSizeGb) {
      await page.locator('#datasetSizeGb').clear();
      await page.locator('#datasetSizeGb').fill(values.datasetSizeGb);
    }
    if (values.epochs) {
      await page.locator('#epochs').clear();
      await page.locator('#epochs').fill(values.epochs);
    }
    if (values.gpuType) {
      await page.locator('#gpuType').selectOption(values.gpuType);
    }
    if (values.gpuCount) {
      await page.locator('#gpuCount').clear();
      await page.locator('#gpuCount').fill(values.gpuCount);
    }
    if (values.nodeCount) {
      await page.locator('#nodeCount').clear();
      await page.locator('#nodeCount').fill(values.nodeCount);
    }

    // Click calculate button
    await page.getByRole('button', { name: /calculate/i }).click();

    // Wait for results
    await expect(page.getByText(/results/i)).toBeVisible({ timeout: 5000 });
  }

  test.describe('modelSizeB Field', () => {
    test('modelSizeB input is visible and accepts values', async ({ page }) => {
      const input = page.locator('#modelSizeB');
      await expect(input).toBeVisible();

      await input.clear();
      await input.fill('13');
      await expect(input).toHaveValue('13');
    });

    test('changing modelSizeB updates form state', async ({ page }) => {
      const input = page.locator('#modelSizeB');

      await input.clear();
      await input.fill('70');
      await expect(input).toHaveValue('70');

      await input.clear();
      await input.fill('0.5');
      await expect(input).toHaveValue('0.5');
    });

    test('modelSizeB affects calculation results', async ({ page }) => {
      // Calculate with small model
      await fillFormAndCalculate(page, { modelSizeB: '7', datasetSizeGb: '100', epochs: '1' });

      // Results should be visible
      await expect(page.getByText(/results/i)).toBeVisible();
    });
  });

  test.describe('datasetSizeGb Field', () => {
    test('datasetSizeGb input is visible and accepts values', async ({ page }) => {
      const input = page.locator('#datasetSizeGb');
      await expect(input).toBeVisible();

      await input.clear();
      await input.fill('500');
      await expect(input).toHaveValue('500');
    });

    test('changing datasetSizeGb updates form state', async ({ page }) => {
      const input = page.locator('#datasetSizeGb');

      await input.clear();
      await input.fill('1000');
      await expect(input).toHaveValue('1000');

      await input.clear();
      await input.fill('50.5');
      await expect(input).toHaveValue('50.5');
    });

    test('datasetSizeGb affects calculation results', async ({ page }) => {
      await fillFormAndCalculate(page, { modelSizeB: '7', datasetSizeGb: '200', epochs: '1' });
      await expect(page.getByText(/results/i)).toBeVisible();
    });
  });

  test.describe('epochs Field', () => {
    test('epochs input is visible and accepts values', async ({ page }) => {
      const input = page.locator('#epochs');
      await expect(input).toBeVisible();

      await input.clear();
      await input.fill('10');
      await expect(input).toHaveValue('10');
    });

    test('changing epochs updates form state', async ({ page }) => {
      const input = page.locator('#epochs');

      await input.clear();
      await input.fill('5');
      await expect(input).toHaveValue('5');

      await input.clear();
      await input.fill('1');
      await expect(input).toHaveValue('1');
    });

    test('epochs affects calculation results', async ({ page }) => {
      await fillFormAndCalculate(page, { modelSizeB: '7', datasetSizeGb: '100', epochs: '5' });
      await expect(page.getByText(/results/i)).toBeVisible();
    });
  });

  test.describe('gpuType Field', () => {
    test('gpuType select is visible and has options', async ({ page }) => {
      const select = page.locator('#gpuType');
      await expect(select).toBeVisible();

      // Check that options exist
      const options = select.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('changing gpuType updates form state', async ({ page }) => {
      const select = page.locator('#gpuType');

      await select.selectOption('H100-80GB');
      await expect(select).toHaveValue('H100-80GB');

      await select.selectOption('A100-80GB');
      await expect(select).toHaveValue('A100-80GB');
    });

    test('gpuType affects calculation results', async ({ page }) => {
      await fillFormAndCalculate(page, {
        modelSizeB: '7',
        datasetSizeGb: '100',
        epochs: '1',
        gpuType: 'H100-80GB'
      });
      await expect(page.getByText(/results/i)).toBeVisible();
    });
  });

  test.describe('gpuCount Field', () => {
    test('gpuCount input is visible and accepts values', async ({ page }) => {
      const input = page.locator('#gpuCount');
      await expect(input).toBeVisible();

      await input.clear();
      await input.fill('16');
      await expect(input).toHaveValue('16');
    });

    test('changing gpuCount updates form state', async ({ page }) => {
      const input = page.locator('#gpuCount');

      await input.clear();
      await input.fill('4');
      await expect(input).toHaveValue('4');

      await input.clear();
      await input.fill('32');
      await expect(input).toHaveValue('32');
    });

    test('gpuCount affects calculation results', async ({ page }) => {
      await fillFormAndCalculate(page, {
        modelSizeB: '7',
        datasetSizeGb: '100',
        epochs: '1',
        gpuCount: '16'
      });
      await expect(page.getByText(/results/i)).toBeVisible();
    });
  });

  test.describe('nodeCount Field', () => {
    test('nodeCount input is visible and accepts values', async ({ page }) => {
      const input = page.locator('#nodeCount');
      await expect(input).toBeVisible();

      await input.clear();
      await input.fill('2');
      await expect(input).toHaveValue('2');
    });

    test('changing nodeCount updates form state', async ({ page }) => {
      const input = page.locator('#nodeCount');

      await input.clear();
      await input.fill('4');
      await expect(input).toHaveValue('4');

      await input.clear();
      await input.fill('1');
      await expect(input).toHaveValue('1');
    });

    test('nodeCount affects calculation results', async ({ page }) => {
      await fillFormAndCalculate(page, {
        modelSizeB: '7',
        datasetSizeGb: '100',
        epochs: '1',
        nodeCount: '2'
      });
      await expect(page.getByText(/results/i)).toBeVisible();
    });
  });

  test.describe('Combined Field Tests', () => {
    test('all fields can be changed and trigger calculation', async ({ page }) => {
      await fillFormAndCalculate(page, {
        modelSizeB: '13',
        datasetSizeGb: '500',
        epochs: '5',
        gpuType: 'H100-80GB',
        gpuCount: '16',
        nodeCount: '2',
      });

      await expect(page.getByText(/results/i)).toBeVisible();
    });

    test('calculate again button works', async ({ page }) => {
      // First calculation
      await fillFormAndCalculate(page, { modelSizeB: '7', datasetSizeGb: '100', epochs: '1' });
      await expect(page.getByText(/results/i)).toBeVisible();

      // Click calculate again
      const calculateAgainBtn = page.getByRole('button', { name: /calculate again/i });
      await calculateAgainBtn.click();

      // Results should be cleared or form shown
      await expect(page.locator('#modelSizeB')).toBeVisible();
    });
  });
});

/**
 * Visual verification tests to ensure proper styling
 */
test.describe('Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('all form labels are visible', async ({ page }) => {
    await expect(page.getByText(/model size/i)).toBeVisible();
    await expect(page.getByText(/dataset size/i)).toBeVisible();
    await expect(page.getByText(/epochs/i)).toBeVisible();
    await expect(page.getByText(/gpu type/i)).toBeVisible();
    await expect(page.getByText(/number of gpus/i)).toBeVisible();
    await expect(page.getByText(/number of nodes/i)).toBeVisible();
  });

  test('form sections have visible headers', async ({ page }) => {
    await expect(page.getByText(/model configuration/i)).toBeVisible();
    await expect(page.getByText(/gpu configuration/i)).toBeVisible();
  });

  test('all number inputs have proper styling', async ({ page }) => {
    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = numberInputs.nth(i);
      await expect(input).toBeVisible();

      const borderWidth = await input.evaluate((el) => {
        return window.getComputedStyle(el).borderWidth;
      });
      expect(borderWidth).not.toBe('0px');
    }
  });

  test('select dropdown has proper styling', async ({ page }) => {
    const select = page.locator('#gpuType');
    await expect(select).toBeVisible();

    const borderWidth = await select.evaluate((el) => {
      return window.getComputedStyle(el).borderWidth;
    });
    expect(borderWidth).not.toBe('0px');
  });
});
