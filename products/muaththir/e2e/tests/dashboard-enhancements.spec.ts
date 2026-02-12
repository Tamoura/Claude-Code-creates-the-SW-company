import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard Enhancements E2E Tests
 *
 * Tests the three new dashboard enhancement components:
 * 1. QuickLog — inline observation form on the dashboard
 * 2. ExportCSV — CSV download button on the reports page
 * 3. ProgressComparison — bar chart on the family page
 *
 * All API calls are mocked for CI-safe execution.
 * After login, we navigate via sidebar links to preserve the in-memory auth token.
 */

// ==================== Mock Data ====================

const MOCK_CHILD = {
  id: 'child-1',
  name: 'Ahmad',
  dateOfBirth: '2020-03-15',
  gender: 'male' as const,
  ageBand: '3-4',
  photoUrl: null,
  medicalNotes: null,
  allergies: null,
  specialNeeds: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const MOCK_CHILD_2 = {
  ...MOCK_CHILD,
  id: 'child-2',
  name: 'Fatima',
  dateOfBirth: '2022-07-10',
  gender: 'female' as const,
  ageBand: '1-2',
};

const MOCK_DASHBOARD_DATA = {
  childId: 'child-1',
  childName: 'Ahmad',
  ageBand: '3-4',
  overallScore: 65,
  dimensions: [
    { dimension: 'academic', score: 70, factors: { observation: 60, milestone: 80, sentiment: 70 }, observationCount: 5, milestoneProgress: { achieved: 4, total: 10 } },
    { dimension: 'social_emotional', score: 55, factors: { observation: 50, milestone: 60, sentiment: 55 }, observationCount: 3, milestoneProgress: { achieved: 3, total: 8 } },
    { dimension: 'behavioural', score: 80, factors: { observation: 75, milestone: 85, sentiment: 80 }, observationCount: 7, milestoneProgress: { achieved: 6, total: 8 } },
    { dimension: 'aspirational', score: 40, factors: { observation: 35, milestone: 45, sentiment: 40 }, observationCount: 2, milestoneProgress: { achieved: 2, total: 6 } },
    { dimension: 'islamic', score: 75, factors: { observation: 70, milestone: 80, sentiment: 75 }, observationCount: 4, milestoneProgress: { achieved: 5, total: 7 } },
    { dimension: 'physical', score: 60, factors: { observation: 55, milestone: 65, sentiment: 60 }, observationCount: 3, milestoneProgress: { achieved: 3, total: 6 } },
  ],
  calculatedAt: '2025-06-01T12:00:00Z',
};

const MOCK_OBSERVATIONS = [
  { id: 'obs-1', childId: 'child-1', dimension: 'academic', content: 'Read a book independently', sentiment: 'positive', observedAt: '2025-05-30T10:00:00Z', tags: ['reading'], createdAt: '2025-05-30T10:00:00Z', updatedAt: '2025-05-30T10:00:00Z' },
  { id: 'obs-2', childId: 'child-1', dimension: 'behavioural', content: 'Shared toys with sister', sentiment: 'positive', observedAt: '2025-05-29T14:00:00Z', tags: ['sharing'], createdAt: '2025-05-29T14:00:00Z', updatedAt: '2025-05-29T14:00:00Z' },
];

// ==================== Helpers ====================

async function authenticateAndSetupMocks(
  page: Page,
  options?: { childCount?: 'single' | 'multiple' | 'none' }
) {
  const childCount = options?.childCount ?? 'single';

  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-enhancements',
        user: { id: 'user-1', email: 'parent@example.com', name: 'Test Parent' },
      }),
    })
  );

  const childrenData =
    childCount === 'none' ? [] :
    childCount === 'multiple' ? [MOCK_CHILD, MOCK_CHILD_2] :
    [MOCK_CHILD];

  await page.route('**/api/children?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: childrenData,
        pagination: { page: 1, limit: 50, total: childrenData.length, totalPages: 1, hasMore: false },
      }),
    })
  );

  await page.route('**/api/children', (route) => {
    if (route.request().url().includes('?')) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: childrenData,
        pagination: { page: 1, limit: 50, total: childrenData.length, totalPages: 1, hasMore: false },
      }),
    });
  });

  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DASHBOARD_DATA) })
  );

  await page.route('**/api/dashboard/child-2', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ...MOCK_DASHBOARD_DATA, childId: 'child-2', childName: 'Fatima', overallScore: 55 }),
    })
  );

  await page.route('**/api/dashboard/*/recent', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_OBSERVATIONS }) })
  );

  await page.route('**/api/dashboard/*/milestones-due', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );

  // Mock observation creation for QuickLog
  await page.route('**/api/children/*/observations', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'obs-new',
          childId: 'child-1',
          dimension: 'academic',
          content: 'Quick log test entry',
          sentiment: 'neutral',
          observedAt: new Date().toISOString(),
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    }
    // GET observations for ExportCSV
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: MOCK_OBSERVATIONS,
        pagination: { page: 1, limit: 1000, total: 2, totalPages: 1, hasMore: false },
      }),
    });
  });

  // Mock profile for settings
  await page.route('**/api/profile', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'user-1', name: 'Test Parent', email: 'parent@example.com', subscriptionTier: 'free', createdAt: '2025-01-01T00:00:00Z', childCount: 1 }),
    })
  );

  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function navigateToPage(page: Page, href: string) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });
  const link = page.locator(`aside a[href="${href}"]`);
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click({ force: true });
}

// ==================== QuickLog Tests ====================

test.describe('QuickLog Component', () => {
  test('renders QuickLog form on dashboard', async ({ page }) => {
    await authenticateAndSetupMocks(page);

    // QuickLog heading should be visible
    await expect(page.getByText('Quick Log')).toBeVisible({ timeout: 15000 });

    // Dimension selector should exist (check by the default option text)
    const dimSelect = page.locator('select').filter({ hasText: 'Dimension' }).first();
    await expect(dimSelect).toBeVisible();

    // Text input should exist
    const input = page.locator('input[placeholder="What did you observe?"]');
    await expect(input).toBeVisible();

    // Submit button should exist (use button type=submit to be specific)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('submit button is disabled when form is empty', async ({ page }) => {
    await authenticateAndSetupMocks(page);

    await expect(page.getByText('Quick Log')).toBeVisible({ timeout: 15000 });

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('successfully submits observation via QuickLog', async ({ page }) => {
    await authenticateAndSetupMocks(page);

    await expect(page.getByText('Quick Log')).toBeVisible({ timeout: 15000 });

    // Select a dimension
    const dimSelect = page.locator('select').filter({ hasText: 'Dimension' }).first();
    await dimSelect.selectOption('academic');

    // Enter observation content
    const input = page.locator('input[placeholder="What did you observe?"]');
    await input.fill('Child counted to 20 today');

    // Submit
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Success message should appear
    await expect(page.getByText('Observation logged!')).toBeVisible({ timeout: 5000 });

    // Form should be reset
    await expect(input).toHaveValue('');
  });

  test('QuickLog not visible when no children exist', async ({ page }) => {
    await authenticateAndSetupMocks(page, { childCount: 'none' });

    // Should show add child prompt, not QuickLog
    await expect(page.locator('a[href="/onboarding/child"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Quick Log')).not.toBeVisible();
  });
});

// ==================== ExportCSV Tests ====================

test.describe('ExportCSV Component', () => {
  test('renders Export CSV button on reports page', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToPage(page, '/dashboard/reports');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // ExportCSV button should be visible
    const exportBtn = page.getByText('Export CSV');
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
  });

  test('Export CSV button has correct aria-label', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToPage(page, '/dashboard/reports');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    const exportBtn = page.locator('button[aria-label="Download observation data as CSV"]');
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
  });

  test('Export CSV button fetches data on click', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToPage(page, '/dashboard/reports');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Ahmad')).toBeVisible({ timeout: 10000 });

    // Track API calls to verify the export fetches observations
    let observationsFetched = false;
    await page.route('**/api/children/child-1/observations?**', (route) => {
      observationsFetched = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: MOCK_OBSERVATIONS,
          pagination: { page: 1, limit: 1000, total: 2, totalPages: 1, hasMore: false },
        }),
      });
    });

    const exportBtn = page.locator('button[aria-label="Download observation data as CSV"]');
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click();

    // Wait for the export to complete (button text changes to "Exporting..." then back)
    await expect(exportBtn).toContainText('Export CSV', { timeout: 10000 });

    // Verify the API was called
    expect(observationsFetched).toBe(true);
  });
});

// ==================== ProgressComparison Tests ====================

test.describe('ProgressComparison Component', () => {
  test('renders progress comparison chart on family page with multiple children', async ({ page }) => {
    await authenticateAndSetupMocks(page, { childCount: 'multiple' });
    await navigateToPage(page, '/dashboard/family');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // Progress Comparison heading should be visible
    const heading = page.getByText('Progress Comparison');
    await expect(heading).toBeVisible({ timeout: 10000 });

    // There should be at least 3 recharts containers (2 radar + 1 bar chart)
    const chartContainers = page.locator('.recharts-responsive-container');
    await expect(chartContainers).toHaveCount(3, { timeout: 10000 });
  });

  test('progress comparison not shown with single child', async ({ page }) => {
    await authenticateAndSetupMocks(page, { childCount: 'single' });
    await navigateToPage(page, '/dashboard/family');

    // Single child view shows "add another child" message
    await expect(page.getByText('Progress Comparison')).not.toBeVisible({ timeout: 5000 });
  });

  test('family page shows both children names in chart', async ({ page }) => {
    await authenticateAndSetupMocks(page, { childCount: 'multiple' });
    await navigateToPage(page, '/dashboard/family');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // Both child names should appear (in legend or chart)
    await expect(page.getByText('Ahmad').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fatima').first()).toBeVisible({ timeout: 10000 });
  });
});
