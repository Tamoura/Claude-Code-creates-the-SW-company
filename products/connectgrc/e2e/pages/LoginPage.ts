import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the login page (/login)
 *
 * Maps to PRD Section 9.1 — Authentication acceptance criteria.
 * FR-AUTH-05, FR-AUTH-06, FR-AUTH-07
 */
export class LoginPage extends BasePage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.heading = page.locator('text=Welcome Back');
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button:has-text("Sign In")');
    this.errorAlert = page.locator('[role="alert"]');
    this.registerLink = page.locator('a[href="/register"]');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]');
  }

  async goto() {
    await super.goto('/login');
  }

  async expectFormVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message?: string) {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  async navigateToRegister() {
    await this.registerLink.click();
    await this.expectUrl('/register');
  }

  async navigateToForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.expectUrl('/forgot-password');
  }
}
