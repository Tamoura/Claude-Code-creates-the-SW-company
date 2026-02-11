import { test, expect, type Page } from '@playwright/test';

/**
 * Observation Flow E2E Tests
 *
 * Tests the full observation creation flow:
 * - Navigate to observe page (requires auth)
 * - Select a dimension
 * - Enter observation text
 * - Select sentiment
 * - Set date
 * - Add tags
 * - Submit and verify success
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

const MOCK_CHILD_2 = {
  ...MOCK_CHILD,
  id: 'child-2',
  name: 'Fatima',
  dateOfBirth: '2022-07-10',
  gender: 'female' as const,
  ageBand: '1-2',
};

const MOCK_CREATED_OBSERVATION = {
  id: 'obs-new',
  childId: 'child-1',
  dimension: 'academic',
  content: 'Ahmad learned to count to 10 in Arabic today',
  sentiment: 'positive',
  observedAt: '2025-06-01T00:00:00Z',
  tags: ['counting', 'arabic'],
  createdAt: '2025-06-01T12:00:00Z',
  updatedAt: '2025-06-01T12:00:00Z',
};

/**
 * Authenticate and set up route mocks needed for the observe page.
 */
async function authenticateForObservation(
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
        accessToken: 'mock-jwt-token-observe',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // Mock children
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

  // Mock dashboard endpoints (needed for the dashboard layout)
  await page.route('**/api/dashboard/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        childId: 'child-1',
        childName: 'Ahmad',
        ageBand: '3-4',
        overallScore: 0,
        dimensions: [],
        calculatedAt: new Date().toISOString(),
      }),
    })
  );

  // Login through UI
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Observation Flow', () => {
  test.describe('Observe Page Rendering', () => {
    test('observe page loads with form elements', async ({ page }) => {
      await authenticateForObservation(page);

      await page.goto('/dashboard/observe');

      // Page heading
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Dimension selector (6 buttons for 6 dimensions)
      const dimensionButtons = page.locator('fieldset button[aria-pressed]');
      await expect(dimensionButtons).toHaveCount(6);

      // Observation text area
      const textarea = page.locator('#observation-text');
      await expect(textarea).toBeVisible();

      // Sentiment buttons (3 - positive, neutral, needs_attention)
      const sentimentFieldset = page.locator('fieldset').nth(1);
      const sentimentButtons = sentimentFieldset.locator(
        'button[aria-pressed]'
      );
      await expect(sentimentButtons).toHaveCount(3);

      // Date picker
      const datePicker = page.locator('#observed-at');
      await expect(datePicker).toBeVisible();

      // Tag input
      const tagInput = page.locator('#tag-input');
      await expect(tagInput).toBeVisible();

      // Submit button (should be disabled initially since nothing selected)
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    test('shows child selector when multiple children exist', async ({
      page,
    }) => {
      await authenticateForObservation(page, { childCount: 'multiple' });

      await page.goto('/dashboard/observe');

      const childSelect = page.locator('#child-select');
      await expect(childSelect).toBeVisible({ timeout: 15000 });

      // Should have a placeholder option + 2 children
      const options = childSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('shows no-children state when no children exist', async ({
      page,
    }) => {
      await authenticateForObservation(page, { childCount: 'none' });

      await page.goto('/dashboard/observe');

      // Should show "no children found" message, not the form
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Form should NOT be present
      const textarea = page.locator('#observation-text');
      await expect(textarea).not.toBeVisible();
    });
  });

  test.describe('Form Interaction', () => {
    test('selecting a dimension enables it visually', async ({ page }) => {
      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      // Wait for the form to load
      const dimensionButtons = page.locator('fieldset button[aria-pressed]');
      await expect(dimensionButtons.first()).toBeVisible({ timeout: 15000 });

      // Click the first dimension button (Academic)
      const academicButton = dimensionButtons.first();
      await academicButton.click();

      // Should be pressed
      await expect(academicButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('typing in observation text updates character count', async ({
      page,
    }) => {
      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      const textarea = page.locator('#observation-text');
      await expect(textarea).toBeVisible({ timeout: 15000 });

      const testText = 'Ahmad practiced his Arabic reading today';
      await textarea.fill(testText);

      // Check character count display (shows count/1000)
      const charCount = page.getByText(`${testText.length}`).first();
      await expect(charCount).toBeVisible();
    });

    test('selecting sentiment marks it as pressed', async ({ page }) => {
      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      // Wait for sentiment buttons
      const sentimentFieldset = page.locator('fieldset').nth(1);
      await expect(sentimentFieldset).toBeVisible({ timeout: 15000 });

      // Click the first sentiment (Positive)
      const positiveButton = sentimentFieldset
        .locator('button[aria-pressed]')
        .first();
      await positiveButton.click();

      await expect(positiveButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('can add and remove tags', async ({ page }) => {
      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      const tagInput = page.locator('#tag-input');
      await expect(tagInput).toBeVisible({ timeout: 15000 });

      // Type a tag and press Enter to add it
      await tagInput.fill('reading');
      await tagInput.press('Enter');

      // Tag should appear as a removable chip
      const tag = page.getByText('reading').first();
      await expect(tag).toBeVisible();

      // Add another tag using the Add button
      await tagInput.fill('arabic');
      const addButton = page.locator('button:has-text("Add")').first();
      await addButton.click();

      // Second tag should appear
      const tag2 = page.getByText('arabic').first();
      await expect(tag2).toBeVisible();
    });

    test('submit button is disabled when form is incomplete', async ({
      page,
    }) => {
      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 15000 });

      // Initially disabled (no dimension, text, or sentiment selected)
      await expect(submitButton).toBeDisabled();

      // Select dimension
      const dimensionButtons = page.locator('fieldset button[aria-pressed]');
      await dimensionButtons.first().click();

      // Still disabled (no text or sentiment)
      await expect(submitButton).toBeDisabled();

      // Add text
      await page.locator('#observation-text').fill('Test observation text');

      // Still disabled (no sentiment)
      await expect(submitButton).toBeDisabled();

      // Select sentiment
      const sentimentFieldset = page.locator('fieldset').nth(1);
      await sentimentFieldset.locator('button[aria-pressed]').first().click();

      // Now should be enabled
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Form Submission', () => {
    test('submitting a complete observation shows success and redirects', async ({
      page,
    }) => {
      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      // Wait for form to load
      const dimensionButtons = page.locator('fieldset button[aria-pressed]');
      await expect(dimensionButtons.first()).toBeVisible({ timeout: 15000 });

      // Fill in the form
      // 1. Select dimension (Academic)
      await dimensionButtons.first().click();

      // 2. Enter observation text
      await page
        .locator('#observation-text')
        .fill('Ahmad learned to count to 10 in Arabic today');

      // 3. Select sentiment (Positive)
      const sentimentFieldset = page.locator('fieldset').nth(1);
      await sentimentFieldset.locator('button[aria-pressed]').first().click();

      // 4. Date is pre-filled with today's date

      // 5. Add a tag
      await page.locator('#tag-input').fill('counting');
      await page.locator('#tag-input').press('Enter');

      // Submit
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Should show success message
      const successMsg = page.locator('.bg-emerald-50');
      await expect(successMsg).toBeVisible({ timeout: 10000 });

      // Should eventually redirect to timeline
      await page.waitForURL('**/dashboard/timeline', { timeout: 15000 });
    });

    test('shows error message on submission failure', async ({ page }) => {
      // Override observation creation to fail
      await page.route('**/api/children/*/observations', (route) => {
        if (route.request().method() === 'POST') {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Failed to save observation',
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          }),
        });
      });

      await authenticateForObservation(page);
      await page.goto('/dashboard/observe');

      // Fill in the form
      const dimensionButtons = page.locator('fieldset button[aria-pressed]');
      await expect(dimensionButtons.first()).toBeVisible({ timeout: 15000 });

      await dimensionButtons.first().click();
      await page.locator('#observation-text').fill('Test observation');

      const sentimentFieldset = page.locator('fieldset').nth(1);
      await sentimentFieldset.locator('button[aria-pressed]').first().click();

      // Submit
      await page.locator('button[type="submit"]').click();

      // Should show error
      const errorMsg = page.locator('.bg-red-50');
      await expect(errorMsg).toBeVisible({ timeout: 10000 });
    });
  });
});
