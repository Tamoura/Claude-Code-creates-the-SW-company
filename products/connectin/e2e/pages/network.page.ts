import { Page, expect } from '@playwright/test';

export class NetworkPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/network');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/network/);
  }

  async getConnectionCount() {
    return this.page.locator('[data-testid="connection-card"]').or(
      this.page.locator('section').filter({ hasText: /connection/i }).locator('li, article')
    ).count();
  }
}
