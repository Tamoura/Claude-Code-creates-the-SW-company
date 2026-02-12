import { test, expect, type Page } from '@playwright/test';

/**
 * Notification Settings E2E Tests
 *
 * Tests the Notification Preferences settings page:
 * - Loading notification preferences from API
 * - Toggling individual preferences
 * - Success/error feedback
 * - Back link navigation
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

const MOCK_PROFILE = {
  id: 'user-1',
  name: 'Test Parent',
  email: 'parent@example.com',
  subscriptionTier: 'free',
  createdAt: '2025-01-01T00:00:00Z',
  childCount: 1,
};

const DEFAULT_PREFS = {
  dailyReminder: false,
  weeklyDigest: false,
  milestoneAlerts: false,
};

async function authenticateAndSetupMocks(
  page: Page,
  options?: { prefs?: typeof DEFAULT_PREFS }
) {
  let currentPrefs = { ...(options?.prefs ?? DEFAULT_PREFS) };

  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-notifications',
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
  await page.route('**/api/profile', (route) => {
    if (route.request().url().endsWith('/api/profile')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROFILE),
      });
    }
    return route.fallback();
  });

  // Mock notification prefs GET
  await page.route('**/api/profile/notifications', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentPrefs),
      });
    }
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      currentPrefs = { ...currentPrefs, ...body };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentPrefs),
      });
    }
    return route.fallback();
  });

  // Mock sharing GET
  await page.route('**/api/sharing', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
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

async function navigateToNotifications(page: Page) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });

  const settingsLink = page.locator('aside a[href="/dashboard/settings"]');
  await expect(settingsLink).toBeVisible({ timeout: 10000 });
  await settingsLink.click({ force: true });

  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

  const notifLink = page.getByRole('main').locator('a[href="/dashboard/settings/notifications"]');
  await expect(notifLink).toBeVisible({ timeout: 10000 });
  await notifLink.click({ force: true });

  await expect(page.getByText('Notification Preferences')).toBeVisible({ timeout: 15000 });
}

test.describe('Notification Settings Flow', () => {
  test('notification page shows all three toggles', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToNotifications(page);

    // All three toggle switches should be visible
    const switches = page.locator('button[role="switch"]');
    await expect(switches).toHaveCount(3);

    // Labels should be visible
    await expect(page.getByText('Daily Observation Reminder')).toBeVisible();
    await expect(page.getByText('Weekly Digest Email')).toBeVisible();
    await expect(page.getByText('Milestone Alerts')).toBeVisible();
  });

  test('toggles start unchecked by default', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToNotifications(page);

    const switches = page.locator('button[role="switch"]');
    await expect(switches).toHaveCount(3);

    // All should be aria-checked=false
    for (let i = 0; i < 3; i++) {
      await expect(switches.nth(i)).toHaveAttribute('aria-checked', 'false');
    }
  });

  test('toggles reflect pre-existing preferences', async ({ page }) => {
    await authenticateAndSetupMocks(page);

    // The notifications page reads from localStorage, not API.
    // Pre-seed localStorage before navigating.
    await page.evaluate(() => {
      localStorage.setItem(
        'muaththir-notification-prefs',
        JSON.stringify({ dailyReminder: true, weeklyDigest: false, milestoneAlerts: true })
      );
    });

    await navigateToNotifications(page);

    const switches = page.locator('button[role="switch"]');
    await expect(switches).toHaveCount(3);

    await expect(page.getByText('Daily Observation Reminder')).toBeVisible();
    await expect(switches.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(switches.nth(1)).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Milestone Alerts')).toBeVisible();
    await expect(switches.nth(2)).toHaveAttribute('aria-checked', 'true');
  });

  test('clicking a toggle shows saved message', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToNotifications(page);

    const firstSwitch = page.locator('button[role="switch"]').first();
    await expect(firstSwitch).toHaveAttribute('aria-checked', 'false');

    await firstSwitch.click();

    // Should now be checked
    await expect(firstSwitch).toHaveAttribute('aria-checked', 'true');

    // Saved message should appear
    await expect(page.getByText('Preferences saved')).toBeVisible({ timeout: 5000 });
  });

  test('back link navigates to settings page', async ({ page }) => {
    await authenticateAndSetupMocks(page);
    await navigateToNotifications(page);

    const backLink = page.locator('main a[href="/dashboard/settings"]');
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await expect(backLink).toHaveText('Back');
  });
});
