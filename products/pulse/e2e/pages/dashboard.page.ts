import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Pulse dashboard (/dashboard).
 *
 * Encapsulates selectors for the main dashboard view including
 * the sidebar navigation, header, KPI stat cards, risk gauge,
 * activity feed, and charts.
 */
export class DashboardPage {
  readonly page: Page;

  // Layout
  readonly sidebar: Locator;
  readonly header: Locator;
  readonly mainContent: Locator;

  // Dashboard heading
  readonly heading: Locator;
  readonly subtitle: Locator;

  // KPI stat cards
  readonly statCards: Locator;
  readonly prsMergedCard: Locator;
  readonly cycleTimeCard: Locator;
  readonly reviewTimeCard: Locator;
  readonly coverageCard: Locator;

  // Risk gauge
  readonly riskGauge: Locator;

  // Activity feed
  readonly activityFeed: Locator;

  // Sidebar navigation links
  readonly navDashboard: Locator;
  readonly navActivity: Locator;
  readonly navVelocity: Locator;
  readonly navQuality: Locator;
  readonly navRepos: Locator;
  readonly navRisk: Locator;
  readonly navSettings: Locator;

  constructor(page: Page) {
    this.page = page;

    // Layout structure
    this.sidebar = page.locator('nav');
    this.header = page.locator('header');
    this.mainContent = page.locator('main');

    // Dashboard content
    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.subtitle = page.getByText(/engineering pulse at a glance/i);

    // Stat cards - look for the known card titles
    this.statCards = page.locator('[class*="bg-"][class*="rounded"]');
    this.prsMergedCard = page.getByText(/prs merged/i);
    this.cycleTimeCard = page.getByText(/cycle time/i);
    this.reviewTimeCard = page.getByText(/review time/i);
    this.coverageCard = page.getByText(/test coverage/i);

    // Risk gauge
    this.riskGauge = page.getByText(/sprint risk/i);

    // Activity feed
    this.activityFeed = page.getByText(/recent activity/i);

    // Sidebar nav items
    this.navDashboard = page.getByRole('link', { name: /^dashboard$/i });
    this.navActivity = page.getByRole('link', { name: /activity/i });
    this.navVelocity = page.getByRole('link', { name: /velocity/i });
    this.navQuality = page.getByRole('link', { name: /quality/i });
    this.navRepos = page.getByRole('link', { name: /repositories/i });
    this.navRisk = page.getByRole('link', { name: /risk/i });
    this.navSettings = page.getByRole('link', { name: /settings/i });
  }

  /** Navigate to the main dashboard */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  /** Assert the dashboard has loaded with key elements visible */
  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.subtitle).toBeVisible();
  }

  /** Assert all four KPI stat cards are visible */
  async expectStatCardsVisible(): Promise<void> {
    await expect(this.prsMergedCard).toBeVisible();
    await expect(this.cycleTimeCard).toBeVisible();
    await expect(this.reviewTimeCard).toBeVisible();
    await expect(this.coverageCard).toBeVisible();
  }

  /** Assert the risk gauge section is visible */
  async expectRiskGaugeVisible(): Promise<void> {
    await expect(this.riskGauge).toBeVisible();
  }

  /** Navigate to a dashboard sub-page via sidebar */
  async navigateToActivity(): Promise<void> {
    await this.navActivity.click();
    await this.page.waitForURL(/\/dashboard\/activity/);
  }

  async navigateToVelocity(): Promise<void> {
    await this.navVelocity.click();
    await this.page.waitForURL(/\/dashboard\/velocity/);
  }

  async navigateToQuality(): Promise<void> {
    await this.navQuality.click();
    await this.page.waitForURL(/\/dashboard\/quality/);
  }

  async navigateToRepos(): Promise<void> {
    await this.navRepos.click();
    await this.page.waitForURL(/\/dashboard\/repos/);
  }

  async navigateToRisk(): Promise<void> {
    await this.navRisk.click();
    await this.page.waitForURL(/\/dashboard\/risk/);
  }

  async navigateToSettings(): Promise<void> {
    await this.navSettings.click();
    await this.page.waitForURL(/\/dashboard\/settings/);
  }
}
