import { test, expect, type Page } from '@playwright/test';

/**
 * Weekly Digest Flow E2E Tests
 *
 * Tests the Digest page (/dashboard/digest) which shows a weekly summary
 * of children's observations, milestones, top dimensions, and areas
 * needing attention.
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

const MOCK_DASHBOARD_DATA = {
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
  ],
  calculatedAt: '2025-06-01T12:00:00Z',
};

const MOCK_DIGEST = {
  period: { from: '2026-02-05', to: '2026-02-12' },
  children: [
    {
      childId: 'child-1',
      childName: 'Ahmad',
      observationCount: 5,
      milestonesAchieved: 2,
      topDimension: 'academic',
      areasNeedingAttention: ['physical'],
    },
    {
      childId: 'child-2',
      childName: 'Fatima',
      observationCount: 3,
      milestonesAchieved: 1,
      topDimension: 'islamic',
      areasNeedingAttention: ['behavioural'],
    },
  ],
  overall: { totalObservations: 8, totalMilestones: 3 },
};

const MOCK_EMPTY_DIGEST = {
  period: { from: '2026-02-05', to: '2026-02-12' },
  children: [],
  overall: { totalObservations: 0, totalMilestones: 0 },
};

// ==================== Helpers ====================

/**
 * Authenticate and set up all API mocks required for the digest flow.
 * Logs in through the UI to set the in-memory token, then waits for the
 * dashboard redirect.
 */
async function authenticateAndSetupMocks(
  page: Page,
  options?: { digestData?: typeof MOCK_DIGEST | typeof MOCK_EMPTY_DIGEST }
) {
  const digestData = options?.digestData ?? MOCK_DIGEST;

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-digest',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // Mock children endpoint
  const childrenData = [MOCK_CHILD, MOCK_CHILD_2];

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

  // Mock dashboard data
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

  // Mock recent observations
  await page.route('**/api/dashboard/*/recent', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // Mock milestones due
  await page.route('**/api/dashboard/*/milestones-due', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // Mock weekly digest endpoint
  await page.route('**/api/digest/weekly', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(digestData),
    })
  );

  // Perform login through the UI to set the token in memory
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Navigate to a page via a sidebar link.
 */
async function navigateToPage(page: Page, href: string) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });
  const link = page.locator(`aside a[href="${href}"]`);
  await expect(link).toBeVisible({ timeout: 15000 });
  await link.click({ force: true });
  await page.waitForURL(`**${href}`, { timeout: 15000 });
}

// ==================== Digest Page Tests ====================

test.describe('Weekly Digest Flow', () => {
  test.describe('Digest Page with Data', () => {
    test('digest page loads with heading', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/digest');

      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('Weekly Digest');
    });

    test('displays child cards with names', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/digest');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Both children should appear
      await expect(page.getByText('Ahmad')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Fatima')).toBeVisible({ timeout: 10000 });
    });

    test('displays overall summary', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/digest');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Overall Summary heading
      await expect(page.getByText('Overall Summary')).toBeVisible({ timeout: 10000 });

      // Total observations: 8
      await expect(page.getByText('Total Observations')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Total Milestones')).toBeVisible({ timeout: 10000 });
    });

    test('shows top dimension badges', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/digest');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Top Dimension labels
      await expect(page.getByText('Top Dimension').first()).toBeVisible({ timeout: 10000 });

      // Dimension names should appear as badges
      await expect(page.getByText('Academic').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Islamic').first()).toBeVisible({ timeout: 10000 });
    });

    test('shows areas needing attention', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/digest');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Needs Attention" labels
      await expect(page.getByText('Needs Attention').first()).toBeVisible({ timeout: 10000 });

      // Attention dimensions
      await expect(page.getByText('Physical').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Behavioural').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Digest Page with No Activity', () => {
    test('shows empty state when no children have activity', async ({ page }) => {
      await authenticateAndSetupMocks(page, { digestData: MOCK_EMPTY_DIGEST });
      await navigateToPage(page, '/dashboard/digest');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Empty state message
      await expect(
        page.getByText('No activity this week')
      ).toBeVisible({ timeout: 10000 });

      // Log Observation CTA
      const logLink = page.locator('a[href="/dashboard/observe"]');
      await expect(logLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('sidebar has Weekly Digest link', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      // Wait for dashboard to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Sidebar should have digest link
      const digestLink = page.locator('aside a[href="/dashboard/digest"]');
      await expect(digestLink).toBeVisible({ timeout: 10000 });
      await expect(digestLink).toContainText('Weekly Digest');
    });
  });
});
