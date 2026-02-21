import { Page, expect } from '@playwright/test';

export class JobsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/jobs');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/jobs/);
  }

  async getJobCount() {
    return this.page.locator('[data-testid="job-card"]').or(
      this.page.locator('article, li').filter({ hasText: /engineer|developer|مهندس|مطور/i })
    ).count();
  }

  async clickFirstJob() {
    await this.page.locator('[data-testid="job-card"]').or(
      this.page.locator('article').first()
    ).first().click();
  }
}
