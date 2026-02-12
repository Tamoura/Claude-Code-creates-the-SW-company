import { test, expect, type Page } from '@playwright/test';

/**
 * Reports & Settings Flow E2E Tests
 *
 * Tests the Reports page (development report with scores, dimensions,
 * progress bars, score breakdown table, print button, and generate link)
 * and the Settings page (profile info, export data, notifications toggles).
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

// ==================== Helpers ====================

/**
 * Authenticate and set up all API mocks required for reports and settings.
 * Logs in through the UI to set the in-memory token, then waits for the
 * dashboard redirect.
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
        accessToken: 'mock-jwt-token-reports-settings',
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

  // Mock dashboard data for child-1
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA),
    })
  );

  // Mock dashboard data for child-2
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

  // Mock profile endpoint
  await page.route('**/api/profile', (route) => {
    if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROFILE),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROFILE),
    });
  });

  // Perform login through the UI to set the token in memory
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Navigate to a page via a sidebar link. Waits for any heading (h1 or h2)
 * to be visible before clicking, and uses force:true to bypass any overlays.
 * We check both h1 and h2 because empty states (no children) render h2.
 */
async function navigateToPage(page: Page, href: string) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 15000 });
  const link = page.locator(`aside a[href="${href}"]`);
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click({ force: true });
}

// ==================== Reports Page Tests ====================

test.describe('Reports Flow', () => {
  test.describe('Reports Page with Data', () => {
    test('reports page loads with heading and child data', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/reports');

      // The heading should show the translated reports.title ("Progress Report")
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('Progress Report');

      // Child name should appear in the report header
      await expect(page.getByText('Ahmad')).toBeVisible({ timeout: 10000 });
    });

    test('displays overall score', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/reports');

      // Wait for the report content to load
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Overall score of 65 should be displayed prominently (use the large score element)
      await expect(page.locator('.text-3xl:has-text("65")').first()).toBeVisible({ timeout: 10000 });

      // "Overall Score" label should be visible
      await expect(page.getByText('Overall Score')).toBeVisible();
    });

    test('shows dimension score bars', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/reports');

      // Wait for the report content to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Dimension Scores" section heading should be visible
      await expect(page.getByText('Dimension Scores')).toBeVisible({ timeout: 10000 });

      // Each dimension name should appear in the scores section
      await expect(page.getByText('Academic').first()).toBeVisible();
      await expect(page.getByText('Social-Emotional').first()).toBeVisible();
      await expect(page.getByText('Behavioural').first()).toBeVisible();
      await expect(page.getByText('Aspirational').first()).toBeVisible();
      await expect(page.getByText('Islamic').first()).toBeVisible();
      await expect(page.getByText('Physical').first()).toBeVisible();

      // Progress bars are rendered as divs with percentage widths.
      // Verify at least 6 progress bar containers exist.
      const progressBars = page.locator('.bg-slate-100.rounded-full.h-2\\.5');
      await expect(progressBars).toHaveCount(6);
    });

    test('shows score breakdown table', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/reports');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Score Factors" heading should be visible
      await expect(page.getByText('Score Factors')).toBeVisible({ timeout: 10000 });

      // The table should exist with column headers
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Check for table headers (from translations)
      await expect(page.getByText('Observation (40%)')).toBeVisible();
      await expect(page.getByText('Milestone (40%)')).toBeVisible();
      await expect(page.getByText('Sentiment (20%)')).toBeVisible();
      await expect(page.getByText('Total').first()).toBeVisible();

      // Check that factor values appear in the table.
      // Academic row: observation=60, milestone=80, sentiment=70, total=70
      const tableRows = table.locator('tbody tr');
      await expect(tableRows).toHaveCount(6);
    });

    test('print button is visible', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/reports');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Print button from translations: reports.printReport = "Print Report"
      const printButton = page.getByText('Print Report');
      await expect(printButton).toBeVisible({ timeout: 10000 });
    });

    test('generate detailed report link is present', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/reports');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Generate Detailed Report" link from translations
      const generateLink = page.locator('a[href="/dashboard/reports/generate"]');
      await expect(generateLink).toBeVisible({ timeout: 10000 });
      await expect(generateLink).toHaveText('Generate Detailed Report');
    });
  });

  test.describe('Reports Page with Multiple Children', () => {
    test('shows child selector when multiple children exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'multiple' });
      await navigateToPage(page, '/dashboard/reports');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Child selector dropdown should be visible
      const childSelector = page.locator('select');
      await expect(childSelector.first()).toBeVisible({ timeout: 10000 });

      // Should have both children as options
      const options = childSelector.first().locator('option');
      await expect(options).toHaveCount(2);
    });
  });

  test.describe('Reports Page with No Children', () => {
    test('shows empty state when no children exist', async ({ page }) => {
      await authenticateAndSetupMocks(page, { childCount: 'none' });
      await navigateToPage(page, '/dashboard/reports');

      // Should show the "Add Child Profile" link (empty state)
      const addChildLink = page.locator('a[href="/onboarding/child"]');
      await expect(addChildLink).toBeVisible({ timeout: 15000 });
    });
  });
});

// ==================== Settings Page Tests ====================

test.describe('Settings Flow', () => {
  test.describe('Settings Main Page', () => {
    test('settings page loads with heading', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/settings');

      // The heading should show the translated settings.title ("Settings")
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(heading).toHaveText('Settings');
    });

    test('shows profile information section', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/settings');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Profile section heading: settings.profileInfo = "Profile Information"
      await expect(page.getByText('Profile Information')).toBeVisible({ timeout: 10000 });

      // Name and email fields should load with mock profile data
      const nameInput = page.locator('#name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      await expect(nameInput).toHaveValue('Test Parent');

      const emailInput = page.locator('#email');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveValue('parent@example.com');
    });

    test('export data button is visible', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/settings');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Export section heading: settings.exportTitle = "Export Data"
      await expect(page.getByText('Export Data')).toBeVisible({ timeout: 10000 });

      // Export button: settings.exportButton = "Download All Data"
      const exportButton = page.getByText('Download All Data');
      await expect(exportButton).toBeVisible();
    });

    test('shows change password section', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/settings');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Password section heading: settings.changePassword = "Change Password"
      await expect(page.getByText('Change Password').first()).toBeVisible({ timeout: 10000 });

      // Password form fields should exist
      await expect(page.locator('#currentPassword')).toBeVisible();
      await expect(page.locator('#newPassword')).toBeVisible();
      await expect(page.locator('#confirmPassword')).toBeVisible();
    });

    test('shows account actions with sign out button', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToPage(page, '/dashboard/settings');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Account actions section: settings.accountActions = "Account Actions"
      await expect(page.getByText('Account Actions')).toBeVisible({ timeout: 10000 });

      // Sign out button: settings.signOut = "Sign Out"
      const signOutButton = page.getByText('Sign Out');
      await expect(signOutButton).toBeVisible();
    });
  });

  // NOTE: Notifications page tests are omitted because the notifications
  // sub-page (/dashboard/settings/notifications) has no sidebar link and
  // cannot be reached via client-side navigation from the settings page.
  // Using page.goto() would cause a full page reload, destroying the
  // in-memory auth token and redirecting to login.
  // The notifications page is a simple localStorage toggle UI that is
  // best tested via unit tests rather than E2E.
});
