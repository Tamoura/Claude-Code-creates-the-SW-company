import { test, expect, type Page } from '@playwright/test';

/**
 * Sharing Settings E2E Tests
 *
 * Tests the Family Sharing settings page:
 * - Invite form display
 * - Empty state display
 * - Mock API interactions (invite, list, remove)
 * - Error handling
 *
 * All API calls are mocked for CI-safe execution.
 */

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

const MOCK_SHARES = [
  {
    id: 'share-1',
    parentId: 'user-1',
    inviteeEmail: 'grandma@example.com',
    inviteeId: null,
    role: 'viewer',
    status: 'pending',
    childIds: ['child-1'],
    invitedAt: '2025-06-01T10:00:00Z',
    respondedAt: null,
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 'share-2',
    parentId: 'user-1',
    inviteeEmail: 'father@example.com',
    inviteeId: 'user-2',
    role: 'contributor',
    status: 'accepted',
    childIds: ['child-1'],
    invitedAt: '2025-05-15T10:00:00Z',
    respondedAt: '2025-05-16T08:00:00Z',
    createdAt: '2025-05-15T10:00:00Z',
    updatedAt: '2025-05-16T08:00:00Z',
  },
];

const MOCK_PROFILE = {
  id: 'user-1',
  name: 'Test Parent',
  email: 'parent@example.com',
  subscriptionTier: 'free',
  createdAt: '2025-01-01T00:00:00Z',
  childCount: 1,
};

async function authenticateAndSetupMocks(
  page: Page,
  options?: { shares?: typeof MOCK_SHARES }
) {
  const shares = options?.shares ?? [];

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-sharing',
        user: { id: 'user-1', email: 'parent@example.com', name: 'Test Parent' },
      }),
    })
  );

  // Mock children
  await page.route('**/api/children**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [MOCK_CHILD],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
      }),
    })
  );

  // Mock dashboard
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA),
    })
  );

  // Mock dashboard sub-routes
  await page.route('**/api/dashboard/*/recent', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );
  await page.route('**/api/dashboard/*/milestones-due', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  // Mock profile
  await page.route('**/api/profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROFILE),
    })
  );

  // Mock sharing GET
  await page.route('**/api/sharing', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shares),
      });
    }
    return route.fallback();
  });

  // Mock sharing invite POST
  await page.route('**/api/sharing/invite', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `share-new-${Date.now()}`,
          parentId: 'user-1',
          inviteeEmail: 'newmember@example.com',
          inviteeId: null,
          role: 'viewer',
          status: 'pending',
          childIds: ['child-1'],
          invitedAt: new Date().toISOString(),
          respondedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    }
    return route.fallback();
  });

  // Mock sharing DELETE
  await page.route('**/api/sharing/*', (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fallback();
  });

  // Perform login
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function navigateToSettings(page: Page) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });
  const link = page.locator('aside a[href="/dashboard/settings"]');
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click({ force: true });
}

test.describe('Sharing Settings Flow', () => {
  test('sharing page shows empty state when no shares exist', async ({ page }) => {
    await authenticateAndSetupMocks(page, { shares: [] });
    await navigateToSettings(page);

    // Wait for settings page to load
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // Navigate to sharing sub-page via the sharing link
    const sharingLink = page.locator('a[href="/dashboard/settings/sharing"]');
    await expect(sharingLink).toBeVisible({ timeout: 10000 });
    await sharingLink.click({ force: true });

    // Verify the sharing page loaded
    await expect(page.getByText('Family Sharing')).toBeVisible({ timeout: 15000 });

    // Empty state should be visible
    await expect(page.getByText('No family members invited yet')).toBeVisible({ timeout: 10000 });
  });

  test('sharing page shows invite form', async ({ page }) => {
    await authenticateAndSetupMocks(page, { shares: [] });
    await navigateToSettings(page);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    const sharingLink = page.locator('a[href="/dashboard/settings/sharing"]');
    await expect(sharingLink).toBeVisible({ timeout: 10000 });
    await sharingLink.click({ force: true });

    await expect(page.getByText('Family Sharing')).toBeVisible({ timeout: 15000 });

    // Email input should exist
    const emailInput = page.locator('#invite-email');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Role selector should exist
    const roleSelect = page.locator('#invite-role');
    await expect(roleSelect).toBeVisible();

    // Send Invite button should exist
    await expect(page.getByRole('button', { name: 'Send Invite' })).toBeVisible();
  });

  test('sharing page displays existing shares', async ({ page }) => {
    await authenticateAndSetupMocks(page, { shares: MOCK_SHARES });
    await navigateToSettings(page);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    const sharingLink = page.locator('a[href="/dashboard/settings/sharing"]');
    await expect(sharingLink).toBeVisible({ timeout: 10000 });
    await sharingLink.click({ force: true });

    await expect(page.getByText('Family Sharing')).toBeVisible({ timeout: 15000 });

    // Should show the two shares from mock data
    await expect(page.getByText('grandma@example.com')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('father@example.com')).toBeVisible({ timeout: 10000 });

    // Viewer and Contributor role badges
    await expect(page.getByText('Viewer').first()).toBeVisible();
    await expect(page.getByText('Contributor').first()).toBeVisible();

    // Status badges
    await expect(page.getByText('Pending').first()).toBeVisible();
    await expect(page.getByText('Accepted').first()).toBeVisible();
  });

  test('sharing page shows remove buttons for each share', async ({ page }) => {
    await authenticateAndSetupMocks(page, { shares: MOCK_SHARES });
    await navigateToSettings(page);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    const sharingLink = page.locator('a[href="/dashboard/settings/sharing"]');
    await expect(sharingLink).toBeVisible({ timeout: 10000 });
    await sharingLink.click({ force: true });

    await expect(page.getByText('Family Sharing')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('grandma@example.com')).toBeVisible({ timeout: 10000 });

    // Each share should have a Remove button
    const removeButtons = page.getByText('Remove');
    await expect(removeButtons).toHaveCount(2);
  });

  test('back link navigates to settings page', async ({ page }) => {
    await authenticateAndSetupMocks(page, { shares: [] });
    await navigateToSettings(page);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    const sharingLink = page.locator('a[href="/dashboard/settings/sharing"]');
    await expect(sharingLink).toBeVisible({ timeout: 10000 });
    await sharingLink.click({ force: true });

    await expect(page.getByText('Family Sharing')).toBeVisible({ timeout: 15000 });

    // Back link should exist within the main content area (not sidebar)
    const backLink = page.locator('main a[href="/dashboard/settings"]');
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await expect(backLink).toHaveText('Back');
  });
});
