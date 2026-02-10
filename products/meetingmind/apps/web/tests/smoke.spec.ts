import { test, expect } from '@playwright/test';

test.describe('MeetingMind - Smoke Tests (Zero Errors on First Run)', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No console errors
    expect(consoleErrors, 'Should have no console errors').toHaveLength(0);

    // Page has content
    const body = await page.locator('body').textContent();
    expect(body, 'Body should have content').toBeTruthy();

    // Main heading visible
    const heading = page.locator('h1').first();
    await expect(heading, 'Main heading should be visible').toBeVisible();
  });

  test('branding and tagline visible', async ({ page }) => {
    await page.goto('/');

    // MeetingMind logo/title
    const title = page.getByText('MeetingMind');
    await expect(title, 'MeetingMind title should be visible').toBeVisible();

    // Tagline visible
    const tagline = page.locator('text=/multimodal/i').first();
    await expect(tagline, 'Tagline should be visible').toBeVisible();
  });

  test('value proposition cards visible', async ({ page }) => {
    await page.goto('/');

    // Check for feature cards (Multimodal, AI-Powered, Engagement)
    const cards = page.locator('[class*="bg-white"], [class*="bg-gray"]').filter({ hasText: /multimodal|ai-powered|engagement/i });
    const count = await cards.count();
    expect(count, 'Should have value proposition cards').toBeGreaterThanOrEqual(3);
  });

  test('view demo analysis button works', async ({ page }) => {
    await page.goto('/');

    // Find and click demo button
    const demoButton = page.getByRole('button', { name: /view demo analysis/i }).or(page.getByRole('link', { name: /view demo analysis/i }));
    await expect(demoButton, 'Demo button should be visible').toBeVisible();

    await demoButton.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to analysis page
    expect(page.url(), 'Should navigate to analysis page').toContain('/analysis');

    // No errors after navigation
    expect(consoleErrors, 'Should have no errors after navigation').toHaveLength(0);
  });

  test('analysis page renders all sections', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // No console errors
    expect(consoleErrors, 'Should have no console errors on analysis page').toHaveLength(0);

    // Video player or placeholder
    const video = page.locator('video, iframe, [class*="player"]').first();
    await expect(video, 'Video player should be visible').toBeVisible();

    // Insights panel
    const insights = page.getByText(/summary|action items|key moments/i).first();
    await expect(insights, 'Insights panel should be visible').toBeVisible();

    // Timeline or engagement chart
    const timeline = page.locator('[class*="timeline"], [class*="chart"], svg').first();
    await expect(timeline, 'Timeline/chart should be visible').toBeVisible();
  });

  test('export button visible and styled', async ({ page }) => {
    await page.goto('/analysis');

    // Export Summary button
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton, 'Export button should be visible').toBeVisible();

    // Button should be styled (has background color)
    const bgColor = await exportButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor, 'Export button should have background color').not.toBe('rgba(0, 0, 0, 0)');
  });

  test('no failed network requests', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    expect(failedRequests, 'Should have no failed network requests').toHaveLength(0);
  });

  test('back navigation works', async ({ page }) => {
    await page.goto('/analysis');

    // Find back button
    const backButton = page.getByRole('button', { name: /back/i }).or(page.getByRole('link', { name: /back/i }));
    if (await backButton.count() > 0) {
      await backButton.click();
      await page.waitForLoadState('networkidle');

      // Should be back on homepage
      expect(page.url(), 'Should navigate back to homepage').not.toContain('/analysis');

      // No errors after navigation
      expect(consoleErrors, 'Should have no errors after back navigation').toHaveLength(0);
    }
  });

  test('interactive elements are styled correctly', async ({ page }) => {
    await page.goto('/');

    // All buttons should be visible and have text
    const buttons = page.locator('button, [role="button"], a[class*="button"]');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      await expect(button, `Button ${i} should be visible`).toBeVisible();

      const text = await button.textContent();
      expect(text?.trim(), `Button ${i} should have text`).toBeTruthy();
    }
  });

  test('no React hydration errors', async ({ page }) => {
    const hydrationErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('hydration') || text.includes('Hydration')) {
        hydrationErrors.push(text);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for React to fully hydrate

    expect(hydrationErrors, 'Should have no React hydration errors').toHaveLength(0);
  });
});
