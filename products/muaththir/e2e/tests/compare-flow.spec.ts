import { test, expect, type Page } from '@playwright/test';

/**
 * Compare Flow E2E Tests
 *
 * Tests the compare page (/dashboard/compare):
 * - Page loads with heading when 2+ children exist
 * - Shows child selector chips (toggle buttons for each child)
 * - Displays comparison grid with radar charts when 2+ children selected
 * - Displays dimension breakdown table with scores
 * - Shows "need two children" state when only one child
 * - Shows "no children" state when no children
 *
 * All API calls are mocked for CI-safe execution.
 *
 * IMPORTANT: After login, we navigate via sidebar link clicks (client-side
 * navigation) instead of page.goto() to preserve the in-memory auth token.
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

const MOCK_CHILD_3 = {
  ...MOCK_CHILD,
  id: 'child-3',
  name: 'Omar',
  dateOfBirth: '2021-01-20',
  gender: 'male' as const,
  ageBand: '2-3',
};

const MOCK_DASHBOARD_DATA_CHILD1 = {
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

const MOCK_DASHBOARD_DATA_CHILD2 = {
  childId: 'child-2',
  childName: 'Fatima',
  ageBand: '1-2',
  overallScore: 50,
  dimensions: [
    { dimension: 'academic', score: 45, factors: { observation: 40, milestone: 50, sentiment: 45 }, observationCount: 2, milestoneProgress: { achieved: 2, total: 8 } },
    { dimension: 'social_emotional', score: 60, factors: { observation: 55, milestone: 65, sentiment: 60 }, observationCount: 4, milestoneProgress: { achieved: 4, total: 6 } },
    { dimension: 'behavioural', score: 55, factors: { observation: 50, milestone: 60, sentiment: 55 }, observationCount: 3, milestoneProgress: { achieved: 3, total: 7 } },
    { dimension: 'aspirational', score: 35, factors: { observation: 30, milestone: 40, sentiment: 35 }, observationCount: 1, milestoneProgress: { achieved: 1, total: 5 } },
    { dimension: 'islamic', score: 50, factors: { observation: 45, milestone: 55, sentiment: 50 }, observationCount: 2, milestoneProgress: { achieved: 2, total: 5 } },
    { dimension: 'physical', score: 65, factors: { observation: 60, milestone: 70, sentiment: 65 }, observationCount: 4, milestoneProgress: { achieved: 4, total: 6 } },
  ],
  calculatedAt: '2025-06-01T12:00:00Z',
};

// ==================== Auth & Mock Helpers ====================

/**
 * Authenticate and set up route mocks for the compare page.
 * Logs in through the UI to set the in-memory token, then waits
 * for redirect to the dashboard.
 */
async function authenticateAndSetupMocks(
  page: Page,
  options?: { childCount?: 'none' | 'single' | 'multiple' | 'three' }
) {
  const childCount = options?.childCount ?? 'multiple';

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-compare',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // Mock children endpoint
  const childrenData =
    childCount === 'none'
      ? []
      : childCount === 'single'
        ? [MOCK_CHILD]
        : childCount === 'three'
          ? [MOCK_CHILD, MOCK_CHILD_2, MOCK_CHILD_3]
          : [MOCK_CHILD, MOCK_CHILD_2];

  await page.route('**/api/children?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: childrenData,
        pagination: {
          page: 1,
          limit: 50,
          total: childrenData.length,
          totalPages: 1,
          hasMore: false,
        },
      }),
    })
  );

  // Mock children endpoint without query params (fallback)
  await page.route('**/api/children', (route) => {
    if (route.request().url().includes('?')) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: childrenData,
        pagination: {
          page: 1,
          limit: 50,
          total: childrenData.length,
          totalPages: 1,
          hasMore: false,
        },
      }),
    });
  });

  // Mock dashboard data for each child
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA_CHILD1),
    })
  );

  await page.route('**/api/dashboard/child-2', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA_CHILD2),
    })
  );

  await page.route('**/api/dashboard/child-3', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_DASHBOARD_DATA_CHILD1,
        childId: 'child-3',
        childName: 'Omar',
        overallScore: 58,
      }),
    })
  );

  // Mock dashboard recent observations
  await page.route('**/api/dashboard/*/recent', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // Mock dashboard milestones due
  await page.route('**/api/dashboard/*/milestones-due', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // Login through the UI to set the token in memory
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Navigate to the compare page via sidebar link (preserves in-memory auth token).
 * Waits for any heading to be visible before clicking to avoid React re-render issues.
 */
async function navigateToCompare(page: Page) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });

  const sidebarLink = page.locator('aside a[href="/dashboard/compare"]');
  await expect(sidebarLink).toBeVisible({ timeout: 10000 });
  await sidebarLink.click({ force: true });
  await page.waitForURL('**/dashboard/compare', { timeout: 10000 });
}

// ==================== Tests ====================

test.describe('Compare Flow', () => {
  test.describe('Compare Page with Two Children', () => {
    test('compare page loads with heading', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToCompare(page);

      // Page heading should be "Compare Children"
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('Compare Children');
    });

    test('displays child selector chips for each child', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToCompare(page);

      // Wait for page to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Both child names should appear as toggle buttons
      const ahmadChip = page.locator('button:has-text("Ahmad")');
      await expect(ahmadChip).toBeVisible({ timeout: 10000 });

      const fatimaChip = page.locator('button:has-text("Fatima")');
      await expect(fatimaChip).toBeVisible({ timeout: 10000 });
    });

    test('displays comparison grid when two children selected', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToCompare(page);

      // Wait for page and comparison data to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // The comparison grid should be visible (auto-selects all children)
      const comparisonGrid = page.locator('[data-testid="comparison-grid"]');
      await expect(comparisonGrid).toBeVisible({ timeout: 15000 });

      // Each child card should show child name as h3
      await expect(
        comparisonGrid.locator('h3:has-text("Ahmad")')
      ).toBeVisible({ timeout: 10000 });

      await expect(
        comparisonGrid.locator('h3:has-text("Fatima")')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays overall scores for each child', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToCompare(page);

      // Wait for comparison grid to appear
      const comparisonGrid = page.locator('[data-testid="comparison-grid"]');
      await expect(comparisonGrid).toBeVisible({ timeout: 15000 });

      // Overall score labels
      const scoreLabels = page.getByText('Overall Score');
      const count = await scoreLabels.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('displays dimension breakdown table', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToCompare(page);

      // Wait for page to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Dimension Breakdown" section heading
      await expect(
        page.getByText('Dimension Breakdown')
      ).toBeVisible({ timeout: 15000 });

      // Table should exist
      const table = page.locator('table');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Table should have column headers with child names
      await expect(table.getByText('Ahmad')).toBeVisible({ timeout: 10000 });
      await expect(table.getByText('Fatima')).toBeVisible({ timeout: 10000 });

      // Table should have 6 dimension rows
      const tableRows = table.locator('tbody tr');
      await expect(tableRows).toHaveCount(6);
    });
  });

  test.describe('Compare Page Child Deselection', () => {
    test('deselecting a child hides the comparison grid', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToCompare(page);

      // Wait for comparison grid to appear (both auto-selected)
      const comparisonGrid = page.locator('[data-testid="comparison-grid"]');
      await expect(comparisonGrid).toBeVisible({ timeout: 15000 });

      // Click one child chip to deselect (should leave only 1 selected, hiding comparison)
      const ahmadChip = page.locator('button:has-text("Ahmad")');
      await ahmadChip.click();

      // The comparison grid should no longer be visible (need 2+ selected)
      await expect(comparisonGrid).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Compare Page with Only One Child', () => {
    test('shows need-two-children state when only one child exists', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'single' });
      await navigateToCompare(page);

      // Should show "Two or more children needed" heading
      await expect(
        page.getByText('Two or more children needed')
      ).toBeVisible({ timeout: 15000 });

      // Should show "Add Child" link to onboarding
      const addChildLink = page.locator('a[href="/onboarding/child"]');
      await expect(addChildLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Compare Page with No Children', () => {
    test('shows no-children state when no children exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'none' });
      await navigateToCompare(page);

      // Should show "No children found" heading
      await expect(
        page.getByText('No children found')
      ).toBeVisible({ timeout: 15000 });

      // Should show link to add child
      const addChildLink = page.locator('a[href="/onboarding/child"]');
      await expect(addChildLink).toBeVisible({ timeout: 10000 });
    });
  });
});
