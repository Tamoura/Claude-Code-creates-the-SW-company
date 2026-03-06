import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the public landing page (/)
 *
 * Maps to PRD Section 6.1 — first touchpoint for all users.
 */
export class LandingPage extends BasePage {
  readonly heroHeading: Locator;
  readonly getStartedButton: Locator;
  readonly learnMoreButton: Locator;
  readonly signInLink: Locator;
  readonly headerGetStarted: Locator;
  readonly featureCards: Locator;
  readonly ctaSection: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.heroHeading = page.locator('h1');
    this.getStartedButton = page.locator('a[href="/register"]').first();
    this.learnMoreButton = page.getByRole('link', { name: 'Learn More' });
    this.signInLink = page.locator('a[href="/login"]').first();
    this.headerGetStarted = page.locator('header a[href="/register"]');
    this.featureCards = page.locator('.grid > div');
    this.ctaSection = page.locator('section').last();
  }

  async goto() {
    await super.goto('/');
  }

  async expectHeroVisible() {
    await expect(this.heroHeading).toContainText('GRC Career');
    await expect(this.getStartedButton).toBeVisible();
  }

  async expectFeaturesVisible() {
    await expect(this.featureCards.first()).toBeVisible();
    const count = await this.featureCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  }

  async navigateToRegister() {
    await this.getStartedButton.click();
    await this.expectUrl('/register');
  }

  async navigateToLogin() {
    await this.signInLink.click();
    await this.expectUrl('/login');
  }

  async navigateToHowItWorks() {
    await this.learnMoreButton.click();
    await this.expectUrl('/how-it-works');
  }
}
