import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';

/**
 * Dashboard E2E tests.
 *
 * These tests verify that the main dashboard and its sub-pages
 * render key elements correctly. Since the app currently uses
 * mock data (no live API integration yet), these tests validate
 * the UI rendering layer.
 *
 * Note: Authentication middleware is not yet enforcing redirects,
 * so dashboard pages are accessible without a token during
 * the foundation phase. When auth is enforced, these tests
 * should use the `authedPage` fixture from fixtures/auth.ts.
 */

test.describe('Main dashboard', () => {
  test('renders dashboard heading and subtitle', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('displays all four KPI stat cards', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectStatCardsVisible();
  });

  test('displays the sprint risk gauge', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectRiskGaugeVisible();
  });

  test('displays the activity feed section', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Activity feed should be present on the dashboard
    await expect(dashboard.activityFeed).toBeVisible();
  });

  test('renders sidebar navigation', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Sidebar should contain navigation links (at least on desktop)
    await expect(dashboard.sidebar.first()).toBeVisible();
  });

  test('renders the header', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.header).toBeVisible();
  });
});

test.describe('Dashboard sub-pages', () => {
  test('activity page loads', async ({ page }) => {
    await page.goto('/dashboard/activity');

    // Activity page should have relevant content
    await expect(page.getByText(/activity/i).first()).toBeVisible();
  });

  test('velocity page loads with chart', async ({ page }) => {
    await page.goto('/dashboard/velocity');

    await expect(page.getByText(/velocity/i).first()).toBeVisible();
  });

  test('quality page loads', async ({ page }) => {
    await page.goto('/dashboard/quality');

    await expect(page.getByText(/quality/i).first()).toBeVisible();
  });

  test('repos page loads', async ({ page }) => {
    await page.goto('/dashboard/repos');

    await expect(
      page.getByText(/repositories|repos/i).first()
    ).toBeVisible();
  });

  test('risk page loads', async ({ page }) => {
    await page.goto('/dashboard/risk');

    await expect(page.getByText(/risk/i).first()).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings');

    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });
});
