import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    // Wait for React hydration to complete — CSP was blocking Next.js 16
    // Turbopack inline scripts; with that fixed, networkidle is sufficient.
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.locator('button[type="submit"]').click();
  }

  async expectError() {
    // Filter out the empty Next.js route announcer (also role="alert") by
    // requiring the element to have non-whitespace text content.
    await expect(
      this.page.getByRole('alert').filter({ hasText: /\S/ })
    ).toBeVisible({ timeout: 8_000 });
  }
}

export class RegisterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  async register(displayName: string, email: string, password: string) {
    // Fill name field
    await this.page.getByLabel(/name|الاسم/i).fill(displayName);
    await this.page.getByLabel(/email/i).fill(email);
    // Get password fields — use index if there are two
    const passwordFields = this.page.getByLabel(/password/i);
    await passwordFields.first().fill(password);
    const count = await passwordFields.count();
    if (count > 1) {
      await passwordFields.nth(1).fill(password);
    }
    await this.page.locator('button[type="submit"]').click();
  }
}
