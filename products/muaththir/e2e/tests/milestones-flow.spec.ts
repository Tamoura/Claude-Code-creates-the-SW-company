import { test, expect, type Page } from '@playwright/test';

/**
 * Milestones Flow E2E Tests
 *
 * Tests:
 * - Viewing the milestones index page (dimension overview)
 * - Navigating to a specific dimension's milestones
 * - Viewing milestone details with checkboxes
 * - Toggling milestone achievement
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

const MOCK_ACADEMIC_MILESTONES = [
  {
    id: 'ms-acad-1',
    dimension: 'academic',
    ageBand: '3-4',
    title: 'Recognizes all letters of the alphabet',
    description: 'Can identify and name all 26 letters',
    guidance: 'Use letter flashcards and alphabet songs',
    sortOrder: 1,
    achieved: true,
    achievedAt: '2025-03-15T10:00:00Z',
    achievedHistory: null,
  },
  {
    id: 'ms-acad-2',
    dimension: 'academic',
    ageBand: '3-4',
    title: 'Can count to 20',
    description: 'Counts objects accurately up to 20',
    guidance: 'Practice counting during daily activities',
    sortOrder: 2,
    achieved: false,
    achievedAt: null,
    achievedHistory: null,
  },
  {
    id: 'ms-acad-3',
    dimension: 'academic',
    ageBand: '3-4',
    title: 'Writes first name',
    description: 'Can write first name with recognizable letters',
    guidance: 'Provide tracing exercises and name writing practice',
    sortOrder: 3,
    achieved: false,
    achievedAt: null,
    achievedHistory: null,
  },
];

/**
 * Authenticate and set up mocks for milestones pages.
 */
async function authenticateForMilestones(page: Page) {
  // Mock login
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token-milestones',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          name: 'Test Parent',
        },
      }),
    })
  );

  // Mock children
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

  // Mock dashboard data (used by milestones index page)
  await page.route('**/api/dashboard/child-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_DATA),
    })
  );

  // Mock dashboard recent and milestones-due
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

  // Mock child milestones for academic dimension
  await page.route('**/api/children/child-1/milestones**', (route) => {
    if (route.request().method() === 'PATCH') {
      // Toggle milestone
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_ACADEMIC_MILESTONES[1],
          achieved: true,
          achievedAt: new Date().toISOString(),
        }),
      });
    }
    // GET milestones
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: MOCK_ACADEMIC_MILESTONES,
        pagination: {
          page: 1,
          limit: 100,
          total: 3,
          totalPages: 1,
          hasMore: false,
        },
      }),
    });
  });

  // Login through UI
  await page.goto('/login');
  await page.locator('#email').fill('parent@example.com');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Milestones Flow', () => {
  test.describe('Milestones Index Page', () => {
    test('displays heading and six dimension cards', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones');

      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Should show 6 dimension cards (one per dimension)
      const dimensionCards = page.locator('.grid > a');
      await expect(dimensionCards).toHaveCount(6);
    });

    test('each dimension card shows progress info', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones');

      // Wait for cards to load (not loading skeleton)
      const firstCard = page.locator('.grid > a').first();
      await expect(firstCard).toBeVisible({ timeout: 15000 });

      // Each card should have milestone progress text
      // Looking for "Completed: X" and "Total: Y" or similar text
      const cardText = await firstCard.textContent();
      expect(cardText).toBeTruthy();
    });

    test('clicking a dimension card navigates to detail page', async ({
      page,
    }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones');

      // Click the first dimension card (academic)
      const academicCard = page.locator(
        'a[href="/dashboard/milestones/academic"]'
      );
      await expect(academicCard).toBeVisible({ timeout: 15000 });
      await academicCard.click();

      await expect(page).toHaveURL('/dashboard/milestones/academic');
    });
  });

  test.describe('Dimension Milestones Detail Page', () => {
    test('displays milestones for the academic dimension', async ({
      page,
    }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      // Page heading should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Should show milestone items
      await expect(
        page.getByText('Recognizes all letters of the alphabet')
      ).toBeVisible();
      await expect(page.getByText('Can count to 20')).toBeVisible();
      await expect(page.getByText('Writes first name')).toBeVisible();
    });

    test('achieved milestones show as checked', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      // Wait for milestones to load
      await expect(
        page.getByText('Recognizes all letters of the alphabet')
      ).toBeVisible({ timeout: 15000 });

      // First milestone is achieved - its checkbox should be checked
      const checkboxes = page.locator('input[type="checkbox"]');
      await expect(checkboxes).toHaveCount(3);

      // First checkbox should be checked (achieved)
      await expect(checkboxes.first()).toBeChecked();

      // Second and third should be unchecked
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(checkboxes.nth(2)).not.toBeChecked();
    });

    test('achieved milestone has line-through styling', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      await expect(
        page.getByText('Recognizes all letters of the alphabet')
      ).toBeVisible({ timeout: 15000 });

      // The achieved milestone title should have line-through class
      const achievedTitle = page
        .getByText('Recognizes all letters of the alphabet')
        .first();
      const hasLineThrough = await achievedTitle.evaluate((el) =>
        el.classList.contains('line-through')
      );
      expect(hasLineThrough).toBe(true);
    });

    test('toggling a milestone checkbox triggers optimistic UI update', async ({
      page,
    }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      // Wait for milestones to load
      const secondCheckbox = page.locator('input[type="checkbox"]').nth(1);
      await expect(secondCheckbox).toBeVisible({ timeout: 15000 });
      await expect(secondCheckbox).not.toBeChecked();

      // Click to toggle the second milestone (Can count to 20)
      await secondCheckbox.click();

      // Optimistic UI: should immediately be checked
      await expect(secondCheckbox).toBeChecked();
    });

    test('has back-to-milestones navigation link', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      // Should have a link back to the milestones index
      const backLink = page.locator('a[href="/dashboard/milestones"]');
      await expect(backLink).toBeVisible();
    });

    test('displays guidance text for milestones', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      // Wait for milestones
      await expect(
        page.getByText('Recognizes all letters of the alphabet')
      ).toBeVisible({ timeout: 15000 });

      // First milestone has guidance text
      await expect(
        page.getByText('Use letter flashcards and alphabet songs')
      ).toBeVisible();
    });

    test('shows achieved date for completed milestones', async ({
      page,
    }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/academic');

      await expect(
        page.getByText('Recognizes all letters of the alphabet')
      ).toBeVisible({ timeout: 15000 });

      // The achieved milestone should show the achieved date
      // achievedAt is '2025-03-15T10:00:00Z', so it shows a date string
      const achievedDateText = page.locator('.text-emerald-600').first();
      await expect(achievedDateText).toBeVisible();
    });
  });

  test.describe('Invalid Dimension', () => {
    test('shows not found for invalid dimension slug', async ({ page }) => {
      await authenticateForMilestones(page);
      await page.goto('/dashboard/milestones/invalid-dimension');

      // Should show "not found" message with back link
      const backLink = page.locator('a[href="/dashboard/milestones"]');
      await expect(backLink).toBeVisible({ timeout: 15000 });
    });
  });
});
