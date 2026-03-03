/**
 * pages/BasePage.ts — Abstract base class for all Page Object Models
 *
 * Provides shared navigation, accessibility, and wait utilities
 * used across all page objects.
 */

import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for the page to reach network idle state.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the current page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Skip navigation link — must be present on every page (accessibility).
   */
  get skipNavLink(): Locator {
    return this.page.getByRole('link', { name: /skip to main content/i });
  }

  /**
   * Main content area.
   */
  get mainContent(): Locator {
    return this.page.locator('main');
  }

  /**
   * Primary navigation.
   */
  get nav(): Locator {
    return this.page.locator('nav');
  }

  /**
   * Navigate to a URL relative to baseURL and wait for load.
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }
}
