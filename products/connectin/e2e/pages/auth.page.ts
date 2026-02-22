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
    // Use stable ID selectors: SSR renders Arabic (fallbackLng: 'ar') which
    // would fail /email/i matching. The inputs have deterministic IDs.
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
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
    // Use stable ID selectors: SSR renders Arabic (fallbackLng: 'ar') which
    // fails label-text matching. The inputs have deterministic IDs.
    await this.page.locator('#displayName').fill(displayName);
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.locator('#confirmPassword').fill(password);
    await this.page.locator('button[type="submit"]').click();
  }
}
