import { Page, expect } from '@playwright/test';

export class ProfilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/profile');
  }

  async gotoUser(userId: string) {
    await this.page.goto(`/profile/${userId}`);
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/profile/);
  }

  async editHeadline(headline: string) {
    await this.page.getByRole('button', { name: /edit profile|تعديل/i }).click();
    const input = this.page.getByLabel(/headline|المسمى/i).or(
      this.page.locator('input[name="headlineEn"], input[name="headline"]')
    );
    await input.fill(headline);
    await this.page.getByRole('button', { name: /save|حفظ/i }).click();
  }
}
