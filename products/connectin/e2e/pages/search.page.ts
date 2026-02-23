import { Page, expect } from '@playwright/test';

export class SearchPage {
  constructor(private page: Page) {}

  async goto(query?: string) {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/search/);
  }

  async search(query: string) {
    const input = this.page.locator('input[type="search"]');
    await input.fill(query);
    // Wait for debounced search (300ms) + network
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async getResultSectionCount() {
    return this.page.locator('section[aria-labelledby]').count();
  }

  async clickTab(tab: 'all' | 'people' | 'posts' | 'jobs') {
    const tabBtn = this.page.getByRole('tab', {
      name: new RegExp(tab === 'all' ? 'all|الكل' : tab, 'i'),
    });
    await tabBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}
