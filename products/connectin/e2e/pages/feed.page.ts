import { Page, expect } from '@playwright/test';

export class FeedPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/feed');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/feed/);
  }

  async createPost(content: string) {
    const composer = this.page.getByPlaceholder(/share something|اكتب/i).or(
      this.page.locator('textarea').first()
    );
    await composer.fill(content);
    await this.page.getByRole('button', { name: /post|share|نشر/i }).click();
  }

  async likeFirstPost() {
    const likeBtn = this.page.getByRole('button', { name: /like|إعجاب/i }).first();
    await likeBtn.click();
    return likeBtn;
  }

  async getPostCount() {
    return this.page.locator('[data-testid="post-card"], article').count();
  }
}
