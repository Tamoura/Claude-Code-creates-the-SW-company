import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard Flow E2E Tests
 *
 * The dashboard requires authentication (TokenManager.hasToken()).
 * We authenticate by first logging in through the mocked login API,
 * which sets the token in memory. Then we navigate to the dashboard.
 *
 * All API calls are mocked to avoid needing a running backend.
 */

// Mock data used across dashboard tests
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
  overallScore: 65.5,
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
      factors: { observation: 50, milestone: 60, sentiment: 55 },
      observationCount: 3,
      milestoneProgress: { achieved: 3, total: 8 },
    },
    {
      dimension: 'behavioural',
      score: 80,
      factors: { observation: 75, milestone: 85, sentiment: 80 },
      observationCount: 7,
      milestoneProgress: { achieved: 6, total: 8 },
    },
    {
      dimension: 'aspirational',
      score: 40,
      factors: { observation: 35, milestone: 45, sentiment: 40 },
      observationCount: 2,
      milestoneProgress: { achieved: 2, total: 6 },
    },
    {
      dimension: 'islamic',
      score: 75,
      factors: { observation: 70, milestone: 80, sentiment: 75 },
      observationCount: 4,
      milestoneProgress: { achieved: 5, total: 7 },
    },
    {
      dimension: 'physical',
      score: 60,
      factors: { observation: 55, milestone: 65, sentiment: 60 },
      observationCount: 3,
      milestoneProgress: { achieved: 3, total: 6 },
    },
  ],
  calculatedAt: '2025-06-01T12:00:00Z',
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
];

const MOCK_MILESTONES_DUE = [
  {
    id: 'ms-1',
    dimension: 'academic',
    ageBand: '3-4',
    title: 'Can count to 20',
    description: 'Counts objects accurately up to 20',
    guidance: null,
    sortOrder: 1,
  },
  {
    id: 'ms-2',
    dimension: 'physical',
    ageBand: '3-4',
    title: 'Hops on one foot',
    description: 'Can hop on one foot for at least 5 hops',
    guidance: 'Practice during outdoor play',
    sortOrder: 2,
  },
];

/**
 * Setup route mocks and authenticate by logging in through the UI.
 * This sets the in-memory token via the login flow.
 */
async function authenticateAndSetupMocks(
  page: Page,
  options?: { childCount?: 'single' | 'multiple' | 'none' }
) {
  const childCount = options?.childCount ?? 'single';

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-dashboard',
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
      body: JSON.stringify({ data: MOCK_OBSERVATIONS }),
    })
  );

  // Mock milestones due
  await page.route('**/api/dashboard/*/milestones-due', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_MILESTONES_DUE }),
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

test.describe('Dashboard Flow', () => {
  test.describe('Auth Guard', () => {
    test('unauthenticated user accessing dashboard gets redirected to login', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // DashboardLayout checks TokenManager.hasToken() and redirects
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user accessing /dashboard/observe gets redirected', async ({
      page,
    }) => {
      await page.goto('/dashboard/observe');

      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user accessing /dashboard/timeline gets redirected', async ({
      page,
    }) => {
      await page.goto('/dashboard/timeline');

      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user accessing /dashboard/milestones gets redirected', async ({
      page,
    }) => {
      await page.goto('/dashboard/milestones');

      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user accessing /dashboard/settings gets redirected', async ({
      page,
    }) => {
      await page.goto('/dashboard/settings');

      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user accessing /onboarding sees public page', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Onboarding is a public page (not behind auth guard)
      // It should load without redirecting to login
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Dashboard with Data', () => {
    test('displays page heading and child name', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
    });

    test('displays radar chart section', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      // The development overview section
      const chartSection = page.locator(
        'h2:has-text("Development Overview"), h2:has-text("development")'
      ).first();
      // Wait for the chart to load (it's dynamically imported)
      await expect(chartSection).toBeVisible({ timeout: 15000 });
    });

    test('displays six dimension cards', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      // Wait for dimension cards to load
      const dimensionsSection = page.locator(
        'section[aria-labelledby="dimensions-heading"]'
      );
      await expect(dimensionsSection).toBeVisible({ timeout: 15000 });

      // 6 dimension cards in the grid
      const dimensionCards = dimensionsSection.locator('.grid > *');
      await expect(dimensionCards).toHaveCount(6);
    });

    test('displays recent observations section', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      const obsSection = page.locator(
        'section[aria-labelledby="observations-heading"]'
      );
      await expect(obsSection).toBeVisible({ timeout: 15000 });

      // Should show the mocked observations
      await expect(
        obsSection.getByText('Ahmad read a full page by himself today')
      ).toBeVisible();
      await expect(
        obsSection.getByText(
          'Shared toys with his sister without being asked'
        )
      ).toBeVisible();
    });

    test('displays milestones due section', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      const msSection = page.locator(
        'section[aria-labelledby="milestones-heading"]'
      );
      await expect(msSection).toBeVisible({ timeout: 15000 });

      await expect(msSection.getByText('Can count to 20')).toBeVisible();
      await expect(msSection.getByText('Hops on one foot')).toBeVisible();
    });

    test('has floating action button to log observation', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);

      const fab = page.locator('a[href="/dashboard/observe"]').last();
      await expect(fab).toBeVisible();
    });
  });

  test.describe('Dashboard with Multiple Children', () => {
    test('displays child selector when multiple children exist', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page, {
        childCount: 'multiple',
      });

      // Child selector should be visible
      const childSelector = page.locator('select');
      await expect(childSelector.first()).toBeVisible({ timeout: 15000 });

      // Should have both children as options
      const options = childSelector.first().locator('option');
      await expect(options).toHaveCount(2);
    });
  });

  test.describe('Dashboard with No Children', () => {
    test('shows add-first-child prompt when no children exist', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page, { childCount: 'none' });

      // Should show the "Add your first child" prompt
      const addChildLink = page.locator('a[href="/onboarding/child"]');
      await expect(addChildLink).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('sidebar displays navigation links', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      // Wait for sidebar to load
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible({ timeout: 15000 });

      // Check key navigation links
      await expect(
        sidebar.locator('a[href="/dashboard"]').first()
      ).toBeVisible();
      await expect(
        sidebar.locator('a[href="/dashboard/observe"]')
      ).toBeVisible();
      await expect(
        sidebar.locator('a[href="/dashboard/timeline"]')
      ).toBeVisible();
      await expect(
        sidebar.locator('a[href="/dashboard/milestones"]')
      ).toBeVisible();
      await expect(
        sidebar.locator('a[href="/dashboard/settings"]')
      ).toBeVisible();
    });

    test('sidebar shows Muaththir branding', async ({ page }) => {
      await authenticateAndSetupMocks(page);

      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible({ timeout: 15000 });

      // Should have the Muaththir name
      await expect(
        sidebar.getByText("Mu'aththir")
      ).toBeVisible();
    });
  });
});
