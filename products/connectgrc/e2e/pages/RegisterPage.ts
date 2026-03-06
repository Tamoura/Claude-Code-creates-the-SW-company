import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the registration page (/register)
 *
 * Maps to PRD Section 6.1 — Registration and Onboarding Flow
 * FR-AUTH-01, FR-AUTH-02, FR-AUTH-03
 */
export class RegisterPage extends BasePage {
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Create Account' });
    this.nameInput = page.locator('input#name');
    this.emailInput = page.locator('input[type="email"]');
    this.roleSelect = page.locator('select#role');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').last();
    this.submitButton = page.getByRole('button', { name: /create|sign up|register/i });
    this.loginLink = page.locator('a[href="/login"]');
    this.errorAlert = page.locator('[role="alert"]');
  }

  async goto() {
    await super.goto('/register');
  }

  async expectFormVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.roleSelect).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async fillForm(data: {
    name: string;
    email: string;
    role?: string;
    password: string;
    confirmPassword?: string;
  }) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    if (data.role) {
      await this.roleSelect.selectOption(data.role);
    }
    await this.passwordInput.fill(data.password);
    if (data.confirmPassword && await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(data.confirmPassword);
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async navigateToLogin() {
    await this.loginLink.click();
    await this.expectUrl('/login');
  }
}
