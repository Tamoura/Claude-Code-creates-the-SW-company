/**
 * pages/HomePage.ts — Page Object Model for the AI Fluency home page (/)
 *
 * The home page is a marketing/landing page with:
 * - Hero section with CTAs
 * - 4-dimension feature highlights
 * - Navigation to login and register
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {
  readonly heroTitle: Locator;
  readonly startAssessmentButton: Locator;
  readonly learnMoreButton: Locator;
  readonly signInLink: Locator;
  readonly getStartedLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heroTitle = page.locator('h1');
    this.startAssessmentButton = page.getByRole('link', { name: /start free assessment/i });
    this.learnMoreButton = page.getByRole('link', { name: /learn more/i });
    this.signInLink = page.getByRole('link', { name: /sign in/i });
    this.getStartedLink = page.getByRole('link', { name: /get started/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Click 'Start Free Assessment' CTA and wait for navigation.
   */
  async clickStartAssessment(): Promise<void> {
    await this.startAssessmentButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to the sign-in page via the nav link.
   */
  async clickSignIn(): Promise<void> {
    await this.signInLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to the register page via the nav link.
   */
  async clickGetStarted(): Promise<void> {
    await this.getStartedLink.click();
    await this.waitForPageLoad();
  }
}
