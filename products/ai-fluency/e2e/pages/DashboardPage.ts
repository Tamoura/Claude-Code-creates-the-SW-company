/**
 * pages/DashboardPage.ts — Page Object Model for the dashboard (/dashboard)
 *
 * The dashboard is the authenticated home screen showing:
 * - Fluency profile overview
 * - Recent assessments
 * - Learning path progress
 * - Navigation sidebar
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  readonly pageHeading: Locator;
  readonly sidebar: Locator;
  readonly assessmentNavLink: Locator;
  readonly profileNavLink: Locator;
  readonly learningNavLink: Locator;
  readonly orgNavLink: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator('h1, h2').first();
    this.sidebar = page.locator('nav[aria-label], aside nav, [data-testid="sidebar"]');
    this.assessmentNavLink = page.getByRole('link', { name: /assessment/i });
    this.profileNavLink = page.getByRole('link', { name: /my profile|profile/i });
    this.learningNavLink = page.getByRole('link', { name: /learning paths|learning/i });
    this.orgNavLink = page.getByRole('link', { name: /organization/i });
    this.signOutButton = page.getByRole('button', { name: /sign out/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Check whether the dashboard is rendering its main content area.
   */
  async isLoaded(): Promise<boolean> {
    return this.mainContent.isVisible();
  }

  /**
   * Click the Sign Out button.
   */
  async signOut(): Promise<void> {
    await this.signOutButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to the assessment page via the sidebar link.
   */
  async goToAssessment(): Promise<void> {
    await this.assessmentNavLink.click();
    await this.waitForPageLoad();
  }
}
