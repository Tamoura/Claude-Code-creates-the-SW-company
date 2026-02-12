import { test, expect, type Page } from '@playwright/test';

/**
 * Analytics Flow E2E Tests
 *
 * Tests the analytics page (/dashboard/analytics):
 * - Page loads with heading
 * - Shows summary stats (total observations, most active dimension, dimensions covered)
 * - Shows observation-by-dimension bar chart area
 * - Shows sentiment distribution section
 * - Child selector when multiple children
 * - Empty/no-observations state
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

const MOCK_OBSERVATIONS = [
  {
    id: 'obs-1',
    childId: 'child-1',
    dimension: 'academic',
    content: 'Ahmad read a full page by himself today',
    sentiment: 'positive',
    observedAt: '2025-05-30T10:00:00Z',
    tags: ['reading', 'literacy'],
    createdAt: '2025-05-30T10:00:00Z',
    updatedAt: '2025-05-30T10:00:00Z',
  },
  {
    id: 'obs-2',
    childId: 'child-1',
    dimension: 'behavioural',
    content: 'Shared toys with his sister without being asked',
    sentiment: 'positive',
    observedAt: '2025-05-29T14:00:00Z',
    tags: ['sharing'],
    createdAt: '2025-05-29T14:00:00Z',
    updatedAt: '2025-05-29T14:00:00Z',
  },
  {
    id: 'obs-3',
    childId: 'child-1',
    dimension: 'academic',
    content: 'Counted to 20 accurately',
    sentiment: 'positive',
    observedAt: '2025-05-28T09:00:00Z',
    tags: ['counting'],
    createdAt: '2025-05-28T09:00:00Z',
    updatedAt: '2025-05-28T09:00:00Z',
  },
  {
    id: 'obs-4',
    childId: 'child-1',
    dimension: 'islamic',
    content: 'Recited Surah Al-Fatiha from memory',
    sentiment: 'positive',
    observedAt: '2025-05-27T08:00:00Z',
    tags: ['quran'],
    createdAt: '2025-05-27T08:00:00Z',
    updatedAt: '2025-05-27T08:00:00Z',
  },
  {
    id: 'obs-5',
    childId: 'child-1',
    dimension: 'physical',
    content: 'Struggled with hopping on one foot',
    sentiment: 'needs_attention',
    observedAt: '2025-05-26T16:00:00Z',
    tags: ['motor-skills'],
    createdAt: '2025-05-26T16:00:00Z',
    updatedAt: '2025-05-26T16:00:00Z',
  },
];

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

// ==================== Auth & Mock Helpers ====================

/**
 * Authenticate and set up route mocks for the analytics page.
 * Logs in through the UI to set the in-memory token, then waits
 * for redirect to the dashboard.
 */
async function authenticateAndSetupMocks(
  page: Page,
  options?: {
    childCount?: 'single' | 'multiple' | 'none';
    observationsData?: typeof MOCK_OBSERVATIONS | [];
  }
) {
  const childCount = options?.childCount ?? 'single';
  const observationsData = options?.observationsData ?? MOCK_OBSERVATIONS;

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-analytics',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // Mock children endpoint (with query params)
  const childrenData =
    childCount === 'none'
      ? []
      : childCount === 'multiple'
        ? [MOCK_CHILD, MOCK_CHILD_2]
        : [MOCK_CHILD];

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

  // Mock observations endpoint (analytics fetches with limit=200)
  await page.route('**/api/children/*/observations**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: observationsData,
        pagination: {
          page: 1,
          limit: 200,
          total: observationsData.length,
          totalPages: 1,
          hasMore: false,
        },
      }),
    })
  );

  // Mock dashboard data (needed because login redirects to /dashboard)
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA),
    })
  );

  await page.route('**/api/dashboard/child-2', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_DASHBOARD_DATA,
        childId: 'child-2',
        childName: 'Fatima',
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
 * Navigate to the analytics page via sidebar link (preserves in-memory auth token).
 * Waits for any heading to be visible before clicking to avoid React re-render issues.
 */
async function navigateToAnalytics(page: Page) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });

  const sidebarLink = page.locator('aside a[href="/dashboard/analytics"]');
  await expect(sidebarLink).toBeVisible({ timeout: 10000 });
  await sidebarLink.click({ force: true });
  await page.waitForURL('**/dashboard/analytics', { timeout: 10000 });
}

// ==================== Tests ====================

test.describe('Analytics Flow', () => {
  test.describe('Analytics Page with Data', () => {
    test('analytics page loads with heading', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToAnalytics(page);

      // Page heading should be "Observation Analytics"
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('Observation Analytics');
    });

    test('displays summary stat cards', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToAnalytics(page);

      // Wait for the analytics data to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Total Observations label and count
      await expect(
        page.getByText('Total Observations')
      ).toBeVisible({ timeout: 15000 });

      // The total count (5 mock observations)
      const totalCount = page.locator('[data-testid="total-observations-count"]');
      await expect(totalCount).toBeVisible({ timeout: 15000 });
      await expect(totalCount).toHaveText('5');

      // Most Active Dimension label
      await expect(
        page.getByText('Most Active Dimension')
      ).toBeVisible({ timeout: 10000 });

      // Most active dimension should be Academic (2 observations)
      const mostActive = page.locator('[data-testid="most-active-dimension"]');
      await expect(mostActive).toBeVisible({ timeout: 10000 });

      // Dimensions Covered label
      await expect(
        page.getByText('Dimensions Covered')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays observation-by-dimension bar chart', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToAnalytics(page);

      // Wait for analytics to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Observations by Dimension" section heading
      await expect(
        page.getByText('Observations by Dimension')
      ).toBeVisible({ timeout: 15000 });

      // Verify dimension bars are rendered (each dimension has a data-testid)
      const academicBar = page.locator('[data-testid="analytics-bar-academic"]');
      await expect(academicBar).toBeVisible({ timeout: 10000 });

      const behaviouralBar = page.locator('[data-testid="analytics-bar-behavioural"]');
      await expect(behaviouralBar).toBeVisible();

      const islamicBar = page.locator('[data-testid="analytics-bar-islamic"]');
      await expect(islamicBar).toBeVisible();

      const physicalBar = page.locator('[data-testid="analytics-bar-physical"]');
      await expect(physicalBar).toBeVisible();
    });

    test('displays sentiment distribution section', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToAnalytics(page);

      // Wait for analytics to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Sentiment Distribution" section heading
      await expect(
        page.getByText('Sentiment Distribution')
      ).toBeVisible({ timeout: 15000 });

      // Positive, Neutral, Needs Attention labels
      await expect(page.getByText('Positive').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Neutral').first()).toBeVisible();
      await expect(page.getByText('Needs Attention').first()).toBeVisible();
    });
  });

  test.describe('Analytics Page with Multiple Children', () => {
    test('shows child selector when multiple children exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToAnalytics(page);

      // Wait for page to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Child selector should be visible
      const childSelector = page.locator('select');
      await expect(childSelector.first()).toBeVisible({ timeout: 10000 });

      // Should have both children as options
      const options = childSelector.first().locator('option');
      await expect(options).toHaveCount(2);
    });
  });

  test.describe('Analytics Empty State', () => {
    test('shows empty state when no observations exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { observationsData: [] });
      await navigateToAnalytics(page);

      // Wait for page to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Empty state heading: "No observations yet"
      await expect(
        page.getByText('No observations yet')
      ).toBeVisible({ timeout: 15000 });

      // Empty state description
      await expect(
        page.getByText('Start logging observations to see analytics.')
      ).toBeVisible({ timeout: 10000 });

      // "Log Observation" CTA link (use role selector to avoid strict mode violation
      // when multiple links point to /dashboard/observe on the page)
      const logLink = page.getByRole('link', { name: 'Log Observation' });
      await expect(logLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Analytics No Children', () => {
    test('shows add-first-child prompt when no children exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'none' });
      await navigateToAnalytics(page);

      // Should show "Add Your First Child" heading
      await expect(
        page.getByText('Add Your First Child')
      ).toBeVisible({ timeout: 15000 });

      // Should show link to onboarding
      const addChildLink = page.locator('a[href="/onboarding/child"]');
      await expect(addChildLink).toBeVisible({ timeout: 10000 });
    });
  });
});
