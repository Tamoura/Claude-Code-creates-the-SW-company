import { Page, expect } from '@playwright/test';

export class FeedPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/feed');
    // Wait for the API data to arrive and React to render posts
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/feed/);
    // Wait for at least one post to be visible
    await this.page.locator('article').first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async createPost(content: string) {
    const composer = this.page.getByPlaceholder(/start a post|share something|اكتب/i).or(
      this.page.locator('textarea').first()
    );
    await composer.fill(content);
    // Scope "Post" button to the composer to avoid matching "Like post" buttons on feed items
    const composerContainer = this.page.locator('textarea').locator('..');
    await composerContainer.getByRole('button', { name: /^post$|^نشر$/i }).click();
  }

  async likeFirstPost() {
    const likeBtn = this.page.getByRole('button', { name: /like|إعجاب/i }).first();
    await likeBtn.click();
    return likeBtn;
  }

  async getPostCount() {
    return this.page.locator('article').count();
  }
}
