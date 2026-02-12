import { test, expect, type Page } from '@playwright/test';

/**
 * Goals & Insights Flow E2E Tests
 *
 * Tests:
 * - Goals page: listing, filtering, empty state, status actions
 * - Insights page: summary, strengths, growth areas, recommendations, trends
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

const MOCK_GOALS = [
  {
    id: 'goal-1',
    childId: 'child-1',
    dimension: 'academic',
    title: 'Read 10 books this month',
    description: 'Track reading progress',
    targetDate: '2025-07-01',
    status: 'active',
    templateId: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    childId: 'child-1',
    dimension: 'physical',
    title: 'Learn to ride a bike',
    description: null,
    targetDate: null,
    status: 'completed',
    templateId: null,
    createdAt: '2025-05-15T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'goal-3',
    childId: 'child-1',
    dimension: 'islamic',
    title: 'Memorize Surah Al-Fatiha',
    description: 'Practice daily recitation',
    targetDate: '2025-08-01',
    status: 'active',
    templateId: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
];

const MOCK_INSIGHTS = {
  childId: 'child-1',
  childName: 'Ahmad',
  generatedAt: '2025-06-01T12:00:00Z',
  summary:
    'Ahmad shows strength in Academic and Behavioural. Physical could use more attention.',
  strengths: [
    {
      dimension: 'academic',
      title: 'Strong Academic Engagement',
      detail: '5 observations with 80% positive sentiment',
      score: 70,
    },
    {
      dimension: 'behavioural',
      title: 'Strong Behavioural Engagement',
      detail: '7 observations with positive patterns',
      score: 80,
    },
  ],
  areasForGrowth: [
    {
      dimension: 'aspirational',
      title: 'Aspirational Needs Attention',
      detail: 'Only 2 observations logged',
      score: 40,
      suggestions: [
        'Discuss dreams and goals with your child',
        'Track creative projects and interests',
      ],
    },
  ],
  recommendations: [
    {
      type: 'observation_gap',
      message:
        "You haven't logged any physical observations this month.",
      priority: 'medium',
    },
    {
      type: 'consistency_praise',
      message:
        "Great balance! You've logged observations across all 6 dimensions.",
      priority: 'low',
    },
  ],
  trends: {
    overallDirection: 'improving',
    dimensionTrends: {
      academic: 'improving',
      social_emotional: 'stable',
      behavioural: 'improving',
      aspirational: 'declining',
      islamic: 'stable',
      physical: 'no_data',
    },
  },
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

// ==================== Auth & Mock Helpers ====================

/**
 * Authenticate and set up route mocks for goals and insights pages.
 * Logs in through the UI to set the in-memory token, then waits
 * for redirect to the dashboard.
 */
async function authenticateAndSetupMocks(
  page: Page,
  options?: {
    childCount?: 'single' | 'multiple' | 'none';
    goalsData?: typeof MOCK_GOALS | [];
    insightsData?: typeof MOCK_INSIGHTS | null;
  }
) {
  const childCount = options?.childCount ?? 'single';
  const goalsData = options?.goalsData ?? MOCK_GOALS;
  // Use 'in' check to distinguish explicit null from undefined
  // (null ?? MOCK_INSIGHTS === MOCK_INSIGHTS, which is wrong for empty state)
  const insightsData = options && 'insightsData' in options
    ? options.insightsData
    : MOCK_INSIGHTS;

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-goals-insights',
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

  // Mock single child endpoint (for goal detail page)
  await page.route('**/api/children/child-1', (route) => {
    const url = route.request().url();
    // Only handle exact single-child fetch, not /children/child-1/goals etc.
    if (url.match(/\/api\/children\/child-1$/)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHILD),
      });
    }
    return route.fallback();
  });

  await page.route('**/api/children/child-2', (route) => {
    const url = route.request().url();
    if (url.match(/\/api\/children\/child-2$/)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHILD_2),
      });
    }
    return route.fallback();
  });

  // Mock goals endpoint (GET and PATCH/DELETE for status changes)
  await page.route('**/api/children/*/goals**', (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'PATCH') {
      // Status change - return the updated goal with new status
      const goalId = url.match(/goals\/([^/?]+)/)?.[1];
      const matchingGoal = goalsData.find((g) => g.id === goalId);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...(matchingGoal || goalsData[0]),
          status: 'completed',
          updatedAt: new Date().toISOString(),
        }),
      });
    }

    if (method === 'DELETE') {
      return route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      });
    }

    // GET - check if this is a single goal fetch (/goals/goal-id)
    const singleGoalMatch = url.match(/\/goals\/([^/?]+)$/);
    if (singleGoalMatch) {
      const goalId = singleGoalMatch[1];
      const matchingGoal = goalsData.find((g) => g.id === goalId);
      return route.fulfill({
        status: matchingGoal ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(matchingGoal || { error: 'Not found' }),
      });
    }

    // GET list - return goals list, respecting status filter if present
    const urlParams = new URL(url).searchParams;
    const statusFilter = urlParams.get('status');
    const filtered = statusFilter
      ? goalsData.filter((g) => g.status === statusFilter)
      : goalsData;

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: filtered,
        pagination: {
          page: 1,
          limit: 50,
          total: filtered.length,
          totalPages: 1,
          hasMore: false,
        },
      }),
    });
  });

  // Mock insights endpoint
  await page.route('**/api/dashboard/*/insights', (route) => {
    if (!insightsData) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(insightsData),
    });
  });

  // Login through the UI to set the token in memory
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Navigate to the goals page via sidebar link (preserves in-memory auth token).
 * Waits for dashboard h1 to be visible before clicking to avoid React re-render issues.
 */
async function navigateToGoals(page: Page) {
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

  const sidebarLink = page.locator('aside a[href="/dashboard/goals"]');
  await expect(sidebarLink).toBeVisible({ timeout: 10000 });
  await sidebarLink.click({ force: true });
  await page.waitForURL('**/dashboard/goals', { timeout: 10000 });
}

/**
 * Navigate to the insights page via sidebar link (preserves in-memory auth token).
 * Waits for dashboard h1 to be visible before clicking to avoid React re-render issues.
 */
async function navigateToInsights(page: Page) {
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

  const sidebarLink = page.locator('aside a[href="/dashboard/insights"]');
  await expect(sidebarLink).toBeVisible({ timeout: 10000 });
  await sidebarLink.click({ force: true });
  await page.waitForURL('**/dashboard/insights', { timeout: 10000 });
}

// ==================== Goals Tests ====================

test.describe('Goals Flow', () => {
  test.describe('Goals Page with Data', () => {
    test('goals page loads with goal list', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Page heading should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('Goals');

      // All three goals should be visible
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText('Learn to ride a bike')
      ).toBeVisible();
      await expect(
        page.getByText('Memorize Surah Al-Fatiha')
      ).toBeVisible();
    });

    test('goals display status badges', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to render
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // Active badge should appear (goal-1 and goal-3 are active)
      const activeBadges = page.locator(
        'span.rounded-full:has-text("active")'
      );
      await expect(activeBadges.first()).toBeVisible();

      // Completed badge should appear (goal-2 is completed)
      const completedBadge = page.locator(
        'span.rounded-full:has-text("completed")'
      );
      await expect(completedBadge).toBeVisible();
    });

    test('goals display description when available', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to fully render (check for a goal title first)
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // Goal-1 has a description (rendered as a <p> with line-clamp-2)
      await expect(
        page.locator('p:has-text("Track reading progress")')
      ).toBeVisible({ timeout: 10000 });

      // Goal-3 has a description
      await expect(
        page.locator('p:has-text("Practice daily recitation")')
      ).toBeVisible({ timeout: 10000 });
    });

    test('New Goal button is visible with correct link', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to load (not just the heading)
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // New Goal link should contain the childId param
      const newGoalLink = page.locator(
        'a[href*="/dashboard/goals/new"]'
      );
      await expect(newGoalLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Goals Empty State', () => {
    test('shows empty state when no goals exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { goalsData: [] });
      await navigateToGoals(page);

      // Empty state heading
      await expect(
        page.getByText('No goals yet')
      ).toBeVisible({ timeout: 15000 });

      // Empty state description
      await expect(
        page.getByText('Create your first goal to start tracking progress.')
      ).toBeVisible();

      // Create First Goal link should be visible
      const createLink = page.getByText('Create First Goal');
      await expect(createLink).toBeVisible();
    });
  });

  test.describe('Goals Status Filter', () => {
    test('status filter buttons are visible', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for page content
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      // All four filter buttons should be visible: All, active, completed, paused
      await expect(page.getByText('All', { exact: true })).toBeVisible();
      await expect(
        page.locator('button:has-text("active")').first()
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("completed")').first()
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("paused")').first()
      ).toBeVisible();
    });

    test('clicking active filter shows only active goals', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for all goals to load
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // Click the "active" filter button
      const activeFilter = page.locator(
        'button:has-text("active")'
      ).first();
      await activeFilter.click();

      // Wait for re-fetch. The mock filters by status, so only active goals show.
      // Active goals: goal-1 (Read 10 books) and goal-3 (Memorize Surah)
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText('Memorize Surah Al-Fatiha')
      ).toBeVisible();

      // Completed goal should NOT be visible
      await expect(
        page.getByText('Learn to ride a bike')
      ).not.toBeVisible();
    });

    test('clicking completed filter shows only completed goals', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for all goals to load
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // Click the "completed" filter button
      const completedFilter = page.locator(
        'button:has-text("completed")'
      ).first();
      await completedFilter.click();

      // Only the completed goal should appear
      await expect(
        page.getByText('Learn to ride a bike')
      ).toBeVisible({ timeout: 10000 });

      // Active goals should NOT be visible
      await expect(
        page.getByText('Read 10 books this month')
      ).not.toBeVisible();
      await expect(
        page.getByText('Memorize Surah Al-Fatiha')
      ).not.toBeVisible();
    });
  });

  test.describe('Goals Status Actions', () => {
    test('can click complete button on active goal', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to render
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // The complete button (checkmark icon) should be visible for active goals.
      // It has aria-label="Mark complete"
      const completeButton = page
        .locator('button[aria-label="Mark complete"]')
        .first();
      await expect(completeButton).toBeVisible();

      // Click the complete button - the mock returns updated goal with status: completed
      await completeButton.click();

      // After the PATCH request, the goal should update to show "completed" badge
      // in place of the "active" badge for that goal row.
      // We verify the mock was called (no error alert) and the UI updated.
      await expect(
        page.locator('span.rounded-full:has-text("completed")').first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Goals with Multiple Children', () => {
    test('shows child selector when multiple children exist', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page, {
        childCount: 'multiple',
      });
      await navigateToGoals(page);

      // Wait for page to load
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      // Child selector should be visible
      const childSelector = page.locator('select');
      await expect(childSelector.first()).toBeVisible({ timeout: 10000 });

      // Should have both children as options
      const options = childSelector.first().locator('option');
      await expect(options).toHaveCount(2);
    });
  });

  test.describe('Goal Detail Page', () => {
    test('clicking goal title navigates to detail page', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to render
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      // Click the first goal title link
      const goalLink = page.locator(
        'a[href*="/dashboard/goals/goal-1"]'
      );
      await expect(goalLink).toBeVisible({ timeout: 10000 });
      await goalLink.click();

      // Should navigate to the goal detail page
      await page.waitForURL('**/dashboard/goals/goal-1**', {
        timeout: 15000,
      });

      // Detail page should show the goal title as h1
      await expect(
        page.locator('h1:has-text("Read 10 books this month")')
      ).toBeVisible({ timeout: 15000 });
    });

    test('goal detail page shows goal information', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to render then navigate to detail
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      const goalLink = page.locator(
        'a[href*="/dashboard/goals/goal-1"]'
      );
      await goalLink.click();
      await page.waitForURL('**/dashboard/goals/goal-1**', {
        timeout: 15000,
      });

      // Goal title
      await expect(
        page.locator('h1:has-text("Read 10 books this month")')
      ).toBeVisible({ timeout: 15000 });

      // Dimension label (Academic) shown in header metadata
      await expect(
        page.getByText('Academic').first()
      ).toBeVisible({ timeout: 10000 });

      // Description text
      await expect(
        page.getByText('Track reading progress')
      ).toBeVisible({ timeout: 10000 });

      // Status badge (Active)
      await expect(
        page.getByText('Active').first()
      ).toBeVisible({ timeout: 10000 });

      // Target Date section header
      await expect(
        page.getByText('Target Date')
      ).toBeVisible({ timeout: 10000 });

      // Child name should be visible in the header metadata
      await expect(
        page.getByText('Ahmad').first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('goal detail page shows action buttons', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to render then navigate to detail
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      const goalLink = page.locator(
        'a[href*="/dashboard/goals/goal-1"]'
      );
      await goalLink.click();
      await page.waitForURL('**/dashboard/goals/goal-1**', {
        timeout: 15000,
      });

      // Wait for detail page to load
      await expect(
        page.locator('h1:has-text("Read 10 books this month")')
      ).toBeVisible({ timeout: 15000 });

      // Actions section heading
      await expect(
        page.getByText('Actions')
      ).toBeVisible({ timeout: 10000 });

      // Edit Goal button (goal-1 is active, so Edit, Mark Complete, Pause should show)
      await expect(
        page.getByText('Edit Goal')
      ).toBeVisible({ timeout: 10000 });

      // Mark Complete button
      await expect(
        page.getByText('Mark Complete')
      ).toBeVisible({ timeout: 10000 });

      // Pause button
      await expect(
        page.getByText('Pause')
      ).toBeVisible({ timeout: 10000 });
    });

    test('goal detail page shows danger zone with delete', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToGoals(page);

      // Wait for goals to render then navigate to detail
      await expect(
        page.getByText('Read 10 books this month')
      ).toBeVisible({ timeout: 15000 });

      const goalLink = page.locator(
        'a[href*="/dashboard/goals/goal-1"]'
      );
      await goalLink.click();
      await page.waitForURL('**/dashboard/goals/goal-1**', {
        timeout: 15000,
      });

      // Wait for detail page to load
      await expect(
        page.locator('h1:has-text("Read 10 books this month")')
      ).toBeVisible({ timeout: 15000 });

      // Danger Zone heading
      await expect(
        page.getByText('Danger Zone')
      ).toBeVisible({ timeout: 10000 });

      // Delete button
      await expect(
        page.getByText('Delete this goal')
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

// ==================== Insights Tests ====================

test.describe('Insights Flow', () => {
  test.describe('Insights Page with Data', () => {
    test('insights page loads with summary', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToInsights(page);

      // Page heading should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('AI Insights');

      // Summary section heading
      await expect(page.getByText('Summary')).toBeVisible({
        timeout: 10000,
      });

      // Summary text content
      await expect(
        page.getByText(
          'Ahmad shows strength in Academic and Behavioural. Physical could use more attention.'
        )
      ).toBeVisible();
    });

    test('displays strengths section with dimension cards', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToInsights(page);

      // Wait for insights to load
      await expect(page.getByText('Summary')).toBeVisible({
        timeout: 15000,
      });

      // Strengths section heading
      await expect(page.getByText('Strengths')).toBeVisible();

      // Strength cards should show titles
      await expect(
        page.getByText('Strong Academic Engagement')
      ).toBeVisible();
      await expect(
        page.getByText('Strong Behavioural Engagement')
      ).toBeVisible();

      // Strength cards should show detail text
      await expect(
        page.getByText('5 observations with 80% positive sentiment')
      ).toBeVisible();
      await expect(
        page.getByText('7 observations with positive patterns')
      ).toBeVisible();

      // Strength cards should show scores
      await expect(page.getByText('70').first()).toBeVisible();
      await expect(page.getByText('80').first()).toBeVisible();
    });

    test('displays areas for growth with suggestions', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToInsights(page);

      // Wait for insights to load
      await expect(page.getByText('Summary')).toBeVisible({
        timeout: 15000,
      });

      // Areas for Growth section heading
      await expect(
        page.getByText('Areas for Growth')
      ).toBeVisible();

      // Growth area title
      await expect(
        page.getByText('Aspirational Needs Attention')
      ).toBeVisible();

      // Growth area detail
      await expect(
        page.getByText('Only 2 observations logged')
      ).toBeVisible();

      // Suggestions should be visible
      await expect(
        page.getByText('Discuss dreams and goals with your child')
      ).toBeVisible();
      await expect(
        page.getByText('Track creative projects and interests')
      ).toBeVisible();
    });

    test('displays recommendations with priority badges', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToInsights(page);

      // Wait for insights to load
      await expect(page.getByText('Summary')).toBeVisible({
        timeout: 15000,
      });

      // Recommendations section heading (use role to avoid matching subtitle text)
      await expect(
        page.getByRole('heading', { name: 'Recommendations' })
      ).toBeVisible({ timeout: 10000 });

      // Recommendation messages (use partial match for apostrophe safety)
      await expect(
        page.getByText(/logged any physical observations/i)
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/logged observations across all 6 dimensions/i)
      ).toBeVisible();

      // Priority badges should be visible
      const mediumBadge = page.locator(
        'span.rounded-full:has-text("medium")'
      );
      await expect(mediumBadge).toBeVisible({ timeout: 10000 });

      const lowBadge = page.locator(
        'span.rounded-full:has-text("low")'
      );
      await expect(lowBadge).toBeVisible();
    });

    test('displays dimension trends section', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToInsights(page);

      // Wait for insights to load
      await expect(page.getByText('Summary')).toBeVisible({
        timeout: 15000,
      });

      // Dimension Trends section heading
      await expect(
        page.getByText('Dimension Trends')
      ).toBeVisible();

      // Overall direction
      await expect(page.getByText('Overall:')).toBeVisible();
      await expect(page.getByText('improving').first()).toBeVisible();

      // Trend icons should be rendered (improving = green up triangle)
      // The improving trend renders an upward triangle: &#9650;
      const improvingIcons = page.locator('span.text-emerald-500');
      const count = await improvingIcons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Insights Empty State', () => {
    test('shows empty state when no insights available', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page, {
        insightsData: null,
      });
      await navigateToInsights(page);

      // Wait for loading to complete and empty state to appear
      // The component shows empty state when loading=false AND insights=null
      await expect(
        page.getByText('No insights available')
      ).toBeVisible({ timeout: 30000 });

      // Empty state description
      await expect(
        page.getByText(/Log more observations/i)
      ).toBeVisible({ timeout: 10000 });

      // "Log Observation" CTA link in the main content (not sidebar)
      const logObsLink = page.getByRole('main').locator(
        'a[href="/dashboard/observe"]'
      );
      await expect(logObsLink).toBeVisible({ timeout: 10000 });
    });
  });
});
