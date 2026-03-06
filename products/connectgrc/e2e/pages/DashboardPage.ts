import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the authenticated dashboard (/dashboard)
 *
 * Maps to PRD Section 3.1 — Aspirant Journey dashboard view.
 */
export class DashboardPage extends BasePage {
  readonly heading: Locator;
  readonly welcomeMessage: Locator;
  readonly highestTierCard: Locator;
  readonly assessmentsTakenCard: Locator;
  readonly domainScoresCard: Locator;
  readonly gettingStartedSection: Locator;
  readonly profileLink: Locator;
  readonly assessmentLink: Locator;
  readonly careerLink: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.heading = page.locator('h1:has-text("Dashboard")');
    this.welcomeMessage = page.locator('text=Welcome back');
    this.highestTierCard = page.locator('text=Highest Tier').locator('..');
    this.assessmentsTakenCard = page.locator('text=Assessments Taken').locator('..');
    this.domainScoresCard = page.locator('text=Domain Scores').locator('..');
    this.gettingStartedSection = page.locator('text=Getting Started').locator('..');
    this.profileLink = page.locator('a[href="/profile"]').first();
    this.assessmentLink = page.locator('a[href="/assessment"]').first();
    this.careerLink = page.locator('a[href="/career"]').first();
  }

  async goto() {
    await super.goto('/dashboard');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async expectStatsCardsVisible() {
    await expect(this.highestTierCard).toBeVisible();
    await expect(this.assessmentsTakenCard).toBeVisible();
    await expect(this.domainScoresCard).toBeVisible();
  }

  async navigateToProfile() {
    await this.profileLink.click();
    await this.expectUrl(/\/profile/);
  }

  async navigateToAssessment() {
    await this.assessmentLink.click();
    await this.expectUrl(/\/assessment/);
  }

  async navigateToCareer() {
    await this.careerLink.click();
    await this.expectUrl(/\/career/);
  }
}
