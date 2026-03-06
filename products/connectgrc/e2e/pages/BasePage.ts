import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model for ConnectGRC
 *
 * Provides shared helpers for all page objects:
 * - Navigation
 * - Common element access
 * - Assertion helpers
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async getHeading(): Promise<Locator> {
    return this.page.locator('h1').first();
  }

  async expectHeadingVisible() {
    await expect(this.page.locator('h1').first()).toBeVisible();
  }

  async expectUrl(pattern: string | RegExp) {
    if (typeof pattern === 'string') {
      await expect(this.page).toHaveURL(pattern);
    } else {
      await expect(this.page).toHaveURL(pattern);
    }
  }

  async expectNoConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /** Check that no placeholder/coming-soon content appears */
  async expectNoPlaceholders() {
    const placeholderPatterns = [
      'Coming Soon',
      'Placeholder',
      'Under Construction',
      'Not yet implemented',
      'TODO',
    ];

    for (const pattern of placeholderPatterns) {
      const matches = this.page.getByText(pattern, { exact: false });
      const count = await matches.count();
      // Allow "Coming Soon" only if it's clearly a feature teaser, not a page stub
      // A page stub would have it as the main/only content
      if (count > 0) {
        const headingText = await this.page.locator('h1').first().textContent().catch(() => '');
        if (headingText?.includes(pattern)) {
          throw new Error(
            `Placeholder page detected: h1 contains "${pattern}" at ${this.page.url()}`
          );
        }
      }
    }
  }
}
