import { test, expect, type Page } from '@playwright/test';

/**
 * Family Page E2E Tests
 *
 * Tests the /dashboard/family page which displays a comparative view
 * of multiple children's development. The page has three states:
 *
 * 1. No children — empty state with "No Children Yet" message
 * 2. Single child — message explaining family view needs multiple children
 * 3. Multiple children — full family overview with radar charts,
 *    child cards, and dimension comparison table
 *
 * All API calls are mocked at the browser level using page.route().
 * Authentication is performed by logging in through the UI so the
 * in-memory token is set. Navigation to the family page is done via
 * sidebar links (not page.goto) to preserve the auth token.
 */

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

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

const MOCK_DASHBOARD = {
  childId: 'child-1',
  childName: 'Ahmad',
  ageBand: '3-4',
  overallScore: 65,
  dimensions: [
    {
      dimension: 'academic',
      score: 70,
      factors: { observation: 60, milestone: 80, sentiment: 70 },
      observationCount: 5,
      milestoneProgress: { achieved: 4, total: 10 },
    },
    {
      dimension: 'social_emotional',
      score: 55,
      factors: {},
      observationCount: 3,
      milestoneProgress: { achieved: 3, total: 8 },
    },
    {
      dimension: 'behavioural',
      score: 80,
      factors: {},
      observationCount: 7,
      milestoneProgress: { achieved: 6, total: 8 },
    },
    {
      dimension: 'aspirational',
      score: 40,
      factors: {},
      observationCount: 2,
      milestoneProgress: { achieved: 2, total: 6 },
    },
    {
      dimension: 'islamic',
      score: 75,
      factors: {},
      observationCount: 4,
      milestoneProgress: { achieved: 5, total: 7 },
    },
    {
      dimension: 'physical',
      score: 60,
      factors: {},
      observationCount: 3,
      milestoneProgress: { achieved: 3, total: 6 },
    },
  ],
  calculatedAt: '2025-06-01T12:00:00Z',
};

const MOCK_DASHBOARD_CHILD_2 = {
  ...MOCK_DASHBOARD,
  childId: 'child-2',
  childName: 'Fatima',
  ageBand: '1-2',
  overallScore: 50,
  dimensions: [
    {
      dimension: 'academic',
      score: 45,
      factors: { observation: 40, milestone: 50, sentiment: 45 },
      observationCount: 3,
      milestoneProgress: { achieved: 2, total: 8 },
    },
    {
      dimension: 'social_emotional',
      score: 60,
      factors: {},
      observationCount: 4,
      milestoneProgress: { achieved: 4, total: 7 },
    },
    {
      dimension: 'behavioural',
      score: 55,
      factors: {},
      observationCount: 3,
      milestoneProgress: { achieved: 3, total: 6 },
    },
    {
      dimension: 'aspirational',
      score: 25,
      factors: {},
      observationCount: 1,
      milestoneProgress: { achieved: 1, total: 5 },
    },
    {
      dimension: 'islamic',
      score: 65,
      factors: {},
      observationCount: 3,
      milestoneProgress: { achieved: 4, total: 6 },
    },
    {
      dimension: 'physical',
      score: 70,
      factors: {},
      observationCount: 5,
      milestoneProgress: { achieved: 4, total: 6 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set up all API route mocks and authenticate via the login UI.
 *
 * @param page      Playwright page
 * @param childCount How many children the mocked API should return
 */
async function authenticateAndSetupMocks(
  page: Page,
  options?: { childCount?: 'none' | 'single' | 'multiple' }
) {
  const childCount = options?.childCount ?? 'multiple';

  // --- Mock login endpoint ---
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-family',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // --- Mock children endpoint (with and without query params) ---
  const childrenData =
    childCount === 'none'
      ? []
      : childCount === 'single'
        ? [MOCK_CHILD]
        : [MOCK_CHILD, MOCK_CHILD_2];

  const childrenResponse = JSON.stringify({
    data: childrenData,
    pagination: {
      page: 1,
      limit: 50,
      total: childrenData.length,
      totalPages: 1,
      hasMore: false,
    },
  });

  // Match with query params
  await page.route('**/api/children?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: childrenResponse,
    })
  );

  // Fallback without query params
  await page.route('**/api/children', (route) => {
    if (route.request().url().includes('?')) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: childrenResponse,
    });
  });

  // --- Mock dashboard data for child-1 ---
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD),
    })
  );

  // --- Mock dashboard data for child-2 ---
  await page.route('**/api/dashboard/child-2', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_CHILD_2),
    })
  );

  // --- Mock recent observations (empty for family view) ---
  await page.route('**/api/dashboard/*/recent', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // --- Mock milestones due (empty for family view) ---
  await page.route('**/api/dashboard/*/milestones-due', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // --- Log in through the UI to set in-memory token ---
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard after login
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Navigate to the family page via the sidebar link.
 *
 * We must navigate via sidebar (not page.goto) to preserve the
 * in-memory auth token. We wait for the dashboard h1 to be visible
 * first, then click the family sidebar link with force: true.
 *
 * Note: When there are no children, the page renders h2 instead of h1.
 * When there is one or more children, it renders h1. We wait for either.
 */
async function navigateToFamily(page: Page) {
  // Wait for dashboard heading to confirm the page has loaded
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });

  // Click the family link in the sidebar
  const familyLink = page.locator('aside a[href="/dashboard/family"]');
  await familyLink.click({ force: true });

  // Wait for the URL to change to the family page
  await page.waitForURL('**/dashboard/family', { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Family Page', () => {
  // -----------------------------------------------------------------------
  // State 1: No children
  // -----------------------------------------------------------------------
  test.describe('No Children', () => {
    test('shows "No Children Yet" message and add child link', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'none' });
      await navigateToFamily(page);

      // The empty state renders an h2 with "No Children Yet"
      const emptyHeading = page.locator('h2:has-text("No Children Yet")');
      await expect(emptyHeading).toBeVisible({ timeout: 15000 });

      // There should be a link to add a child profile
      const addChildLink = page.locator('a[href="/onboarding/child"]');
      await expect(addChildLink).toBeVisible();
    });
  });

  // -----------------------------------------------------------------------
  // State 2: Single child
  // -----------------------------------------------------------------------
  test.describe('Single Child', () => {
    test('shows "only one child" message and "Add Another Child" button', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page, { childCount: 'single' });
      await navigateToFamily(page);

      // Single child state shows the family title as h1
      const heading = page.locator('h1:has-text("Family Overview")');
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Should show the "only one child" explanatory text
      const onlyOneChildText = page.getByText('Only one child profile');
      await expect(onlyOneChildText).toBeVisible();

      // Should have a link to add another child
      const addAnotherLink = page.locator('a[href="/onboarding/child"]');
      await expect(addAnotherLink).toBeVisible();
      await expect(addAnotherLink).toContainText('Add Another Child');
    });
  });

  // -----------------------------------------------------------------------
  // State 3: Multiple children (main view)
  // -----------------------------------------------------------------------
  test.describe('Multiple Children', () => {
    test('shows "Family Overview" heading', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToFamily(page);

      const heading = page.locator('h1:has-text("Family Overview")');
      await expect(heading).toBeVisible({ timeout: 15000 });
    });

    test('shows child cards with names', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToFamily(page);

      // Wait for the family overview to fully load
      const heading = page.locator('h1:has-text("Family Overview")');
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Both children should appear as cards with their names
      const ahmadCard = page.getByText('Ahmad', { exact: false }).first();
      await expect(ahmadCard).toBeVisible({ timeout: 15000 });

      const fatimaCard = page.getByText('Fatima', { exact: false }).first();
      await expect(fatimaCard).toBeVisible({ timeout: 15000 });
    });

    test('shows dimension comparison table with 6 dimension rows', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToFamily(page);

      // Wait for the comparison table heading
      const comparisonHeading = page.getByText('Dimension Comparison');
      await expect(comparisonHeading).toBeVisible({ timeout: 15000 });

      // The table should have a row for each of the 6 dimensions
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // tbody should contain exactly 6 rows (one per dimension)
      const dimensionRows = table.locator('tbody tr');
      await expect(dimensionRows).toHaveCount(6);

      // Verify the dimension names appear in the table
      const dimensionNames = [
        'Academic',
        'Social-Emotional',
        'Behavioural',
        'Aspirational',
        'Islamic',
        'Physical',
      ];

      for (const name of dimensionNames) {
        await expect(table.getByText(name)).toBeVisible();
      }
    });

    test('shows "View Details" links for each child', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToFamily(page);

      // Wait for page to load
      const heading = page.locator('h1:has-text("Family Overview")');
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Each child card should have a "View Details" link
      const viewDetailsLink1 = page.locator(
        'a[href="/dashboard/child/child-1"]'
      );
      await expect(viewDetailsLink1).toBeVisible({ timeout: 15000 });
      await expect(viewDetailsLink1).toContainText('View Details');

      const viewDetailsLink2 = page.locator(
        'a[href="/dashboard/child/child-2"]'
      );
      await expect(viewDetailsLink2).toBeVisible();
      await expect(viewDetailsLink2).toContainText('View Details');
    });
  });
});
