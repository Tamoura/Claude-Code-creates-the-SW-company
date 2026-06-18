import { test, expect } from '@playwright/test';

test.describe('CTOaaS User Journey', () => {
  const testEmail = `e2e-${Date.now()}@test.com`;
  const testPassword = 'E2eTest!234';

  test('landing page displays hero and navigation', async ({ page }) => {
    await page.goto('/');

    // Verify hero heading contains "Advisory" or "Technology Leaders"
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Technology Leaders');

    // Verify nav links are present
    await expect(
      page.getByRole('link', { name: /get started/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /sign in/i })
    ).toBeVisible();
  });

  test('landing page features section renders all cards', async ({ page }) => {
    await page.goto('/');

    // All 6 features should be visible
    const featureTitles = [
      'Strategic Advisory',
      'Knowledge-Backed',
      'Risk Dashboard',
      'Cost Analysis',
      'Technology Radar',
      'Decision Records',
    ];

    for (const title of featureTitles) {
      await expect(page.getByText(title).first()).toBeVisible();
    }
  });

  test('landing page pricing section renders tiers', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Enterprise').first()).toBeVisible();
    await expect(page.getByText('$0')).toBeVisible();
    await expect(page.getByText('$99')).toBeVisible();
  });

  test('Get Started navigates to signup', async ({ page }) => {
    await page.goto('/');

    // Click the hero Get Started link (first one)
    await page.getByRole('link', { name: /get started/i }).first().click();
    await expect(page).toHaveURL('/signup');

    // Verify signup page loaded
    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible();
  });

  test('signup form shows validation errors for empty submission', async ({
    page,
  }) => {
    await page.goto('/signup');

    // Submit empty form
    await page.getByRole('button', { name: /create account/i }).click();

    // Validation errors should appear for required fields
    await expect(page.getByText(/at least 2 characters/i).first()).toBeVisible();
  });

  test('signup form accepts valid input and submits', async ({ page }) => {
    await page.goto('/signup');

    // Fill all fields with valid data
    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/work email/i).fill(testEmail);
    await page.getByLabel(/company name/i).fill('E2E Test Corp');
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByLabel(/confirm password/i).fill(testPassword);

    // Submit
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to verify email pending page
    await expect(
      page.getByText(/check your email/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('login page renders accessible form', async ({ page }) => {
    await page.goto('/login');

    // Verify heading
    await expect(
      page.getByRole('heading', { name: /sign in to ctoaas/i })
    ).toBeVisible();

    // Verify labelled inputs
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify submit button
    await expect(
      page.getByRole('button', { name: /sign in/i })
    ).toBeVisible();

    // Verify link to signup
    await expect(
      page.getByRole('link', { name: /create an account/i })
    ).toBeVisible();
  });

  test('login form shows validation for empty submission', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /sign in/i }).click();

    // At minimum, email validation error should appear
    await expect(
      page.getByText(/valid email/i)
    ).toBeVisible();
  });

  test('verify-email pending page shows correct UI', async ({ page }) => {
    await page.goto(
      '/verify-email/pending?message=Check+your+email+to+verify+your+account'
    );

    await expect(page.getByText(/check your email/i)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /go to sign in/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /return to home page/i })
    ).toBeVisible();
  });

  test('dashboard sidebar navigation links render', async ({ page }) => {
    // Navigate directly to dashboard (may redirect to login without auth,
    // but sidebar links should be testable in layout)
    await page.goto('/dashboard');

    // The dashboard layout sidebar should contain these nav links
    const navLabels = [
      'Dashboard',
      'AI Advisor',
      'Risks',
      'Radar',
      'Costs',
      'ADRs',
      'Settings',
    ];

    for (const label of navLabels) {
      await expect(
        page.getByRole('link', { name: label, exact: true })
      ).toBeVisible();
    }
  });

  test('dashboard sidebar secondary nav links render', async ({ page }) => {
    await page.goto('/dashboard');

    const secondaryLabels = [
      'Reports',
      'Compliance',
      'Team',
      'Integrations',
      'Help',
    ];

    for (const label of secondaryLabels) {
      await expect(
        page.getByRole('link', { name: label, exact: true })
      ).toBeVisible();
    }
  });

  test('sidebar sign out link is visible', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('link', { name: /sign out/i })
    ).toBeVisible();
  });

  test('navigate between dashboard pages via sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Risks
    await page.getByRole('link', { name: 'Risks', exact: true }).click();
    await expect(page).toHaveURL('/risks');

    // Navigate to Costs
    await page.getByRole('link', { name: 'Costs', exact: true }).click();
    await expect(page).toHaveURL('/costs');

    // Navigate to Radar
    await page.getByRole('link', { name: 'Radar', exact: true }).click();
    await expect(page).toHaveURL('/radar');

    // Navigate to ADRs
    await page.getByRole('link', { name: 'ADRs', exact: true }).click();
    await expect(page).toHaveURL('/adrs');

    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL('/settings');

    // Navigate to AI Advisor (chat)
    await page.getByRole('link', { name: 'AI Advisor', exact: true }).click();
    await expect(page).toHaveURL('/chat');

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL('/dashboard');
  });
});
