import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Observation Photo Upload Flow E2E Tests
 *
 * Tests the photo attachment functionality on the observe page (/dashboard/observe):
 * - Photo input is visible and accepts files
 * - Photo preview appears after selecting an image
 * - Photo can be removed after selection
 * - Form still submits correctly with all fields filled
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

const MOCK_CREATED_OBSERVATION = {
  id: 'obs-new',
  childId: 'child-1',
  dimension: 'academic',
  content: 'Ahmad drew a picture of our family',
  sentiment: 'positive',
  observedAt: '2025-06-01T00:00:00Z',
  tags: ['drawing'],
  createdAt: '2025-06-01T12:00:00Z',
  updatedAt: '2025-06-01T12:00:00Z',
};

const MOCK_DASHBOARD_DATA = {
  childId: 'child-1',
  childName: 'Ahmad',
  ageBand: '3-4',
  overallScore: 0,
  dimensions: [],
  calculatedAt: new Date().toISOString(),
};

// ==================== Auth & Mock Helpers ====================

/**
 * Authenticate and set up route mocks for the observe page with photo support.
 * Logs in through the UI to set the in-memory token, then waits
 * for redirect to the dashboard.
 */
async function authenticateAndSetupMocks(page: Page) {
  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-photo',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // Mock children endpoint (single child)
  await page.route('**/api/children?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [MOCK_CHILD],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
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
        data: [MOCK_CHILD],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasMore: false,
        },
      }),
    });
  });

  // Mock observation creation
  await page.route('**/api/children/*/observations', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CREATED_OBSERVATION),
      });
    }
    // GET observations for timeline
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [MOCK_CREATED_OBSERVATION],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasMore: false,
        },
      }),
    });
  });

  // Mock dashboard data (needed for login redirect to /dashboard)
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA),
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
 * Navigate to observe page via sidebar (preserves in-memory auth token).
 * Waits for the dashboard page to fully render before clicking.
 */
async function navigateToObserve(page: Page) {
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

  const sidebarLink = page.locator('aside a[href="/dashboard/observe"]');
  await expect(sidebarLink).toBeVisible({ timeout: 10000 });
  await sidebarLink.click({ force: true });
  await page.waitForURL('**/dashboard/observe', { timeout: 10000 });
}

// ==================== Tests ====================

test.describe('Observation Photo Flow', () => {
  test.describe('Photo Input Visibility', () => {
    test('photo attach button is visible on observe page', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToObserve(page);

      // Wait for form to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // "Photo (optional)" label should be visible
      await expect(
        page.getByText('Photo (optional)')
      ).toBeVisible({ timeout: 10000 });

      // The "Attach Photo" button should be visible
      await expect(
        page.getByText('Attach Photo')
      ).toBeVisible({ timeout: 10000 });

      // The hidden file input should exist with data-testid
      const photoInput = page.locator('[data-testid="photo-input"]');
      await expect(photoInput).toBeAttached();

      // File input accepts correct types
      await expect(photoInput).toHaveAttribute(
        'accept',
        'image/jpeg,image/png,image/webp'
      );
    });

    test('photo hint text is displayed', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToObserve(page);

      // Wait for form to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Photo hint text should be visible
      await expect(
        page.getByText('JPEG, PNG, or WebP. Max 5MB.')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Photo Selection', () => {
    test('selecting a photo shows preview', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToObserve(page);

      // Wait for form to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Create a minimal 1x1 PNG file buffer for testing
      const photoInput = page.locator('[data-testid="photo-input"]');

      // Use a synthetic file via setInputFiles
      // Create a small valid PNG (1x1 pixel) via base64
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const pngBuffer = Buffer.from(pngBase64, 'base64');

      await photoInput.setInputFiles({
        name: 'test-photo.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Photo preview should appear
      const photoPreview = page.locator('[data-testid="photo-preview"]');
      await expect(photoPreview).toBeVisible({ timeout: 10000 });

      // "Remove photo" button should be visible
      await expect(
        page.getByText('Remove photo')
      ).toBeVisible({ timeout: 10000 });

      // "Attach Photo" button should no longer be visible (replaced by preview)
      await expect(
        page.getByText('Attach Photo')
      ).not.toBeVisible();
    });

    test('removing a photo restores the attach button', async ({ page }) => {
      await authenticateAndSetupMocks(page);
      await navigateToObserve(page);

      // Wait for form to load
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

      // Select a photo
      const photoInput = page.locator('[data-testid="photo-input"]');
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const pngBuffer = Buffer.from(pngBase64, 'base64');

      await photoInput.setInputFiles({
        name: 'test-photo.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Verify preview is showing
      const photoPreview = page.locator('[data-testid="photo-preview"]');
      await expect(photoPreview).toBeVisible({ timeout: 10000 });

      // Click "Remove photo"
      const removeButton = page.getByText('Remove photo');
      await removeButton.click();

      // Preview should disappear
      await expect(photoPreview).not.toBeVisible({ timeout: 10000 });

      // "Attach Photo" button should be restored
      await expect(
        page.getByText('Attach Photo')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Form Submission with Photo', () => {
    test('can fill and submit form with all fields including photo context', async ({
      page,
    }) => {
      await authenticateAndSetupMocks(page);
      await navigateToObserve(page);

      // Wait for form to load
      const dimensionButtons = page.locator('fieldset button[aria-pressed]');
      await expect(dimensionButtons.first()).toBeVisible({ timeout: 15000 });

      // 1. Select dimension (Academic)
      await dimensionButtons.first().click();

      // 2. Enter observation text
      await page
        .locator('#observation-text')
        .fill('Ahmad drew a picture of our family');

      // 3. Select sentiment (Positive)
      const sentimentFieldset = page.locator('fieldset').nth(1);
      await sentimentFieldset.locator('button[aria-pressed]').first().click();

      // 4. Add a tag
      await page.locator('#tag-input').fill('drawing');
      await page.locator('#tag-input').press('Enter');

      // 5. Select a photo
      const photoInput = page.locator('[data-testid="photo-input"]');
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const pngBuffer = Buffer.from(pngBase64, 'base64');
      await photoInput.setInputFiles({
        name: 'family-drawing.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Photo preview should appear
      await expect(
        page.locator('[data-testid="photo-preview"]')
      ).toBeVisible({ timeout: 10000 });

      // Submit button should be enabled
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Should show success message
      const successMsg = page.locator('[role="status"]');
      await expect(successMsg).toBeVisible({ timeout: 10000 });

      // Should eventually redirect to timeline
      await page.waitForURL('**/dashboard/timeline', { timeout: 15000 });
    });
  });
});
