/**
 * pages/RegisterPage.ts — Page Object Model for the register page (/register)
 *
 * Registration form fields (from i18n):
 *   - 'Full name'     → name input
 *   - 'Email address' → email input
 *   - 'Password'      → password input
 *   - 'Create Account' → submit button
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class RegisterPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly serverError: Locator;
  readonly signInLink: Locator;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    // Labels come from register form — use flexible matchers to handle i18n
    this.nameInput = page.getByLabel(/name/i);
    this.emailInput = page.getByLabel(/email address/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /create account/i });
    this.serverError = page.locator('[role="alert"]');
    // Register page has two "Sign in" links: nav + form footer. Target the form footer one.
    this.signInLink = page.getByRole('link', { name: 'Sign in', exact: true }).last();
    this.pageHeading = page.locator('h1, h2').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
    await this.waitForPageLoad();
  }

  /**
   * Fill and submit the registration form.
   */
  async register(name: string, email: string, password: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Submit the form with empty fields to trigger validation errors.
   */
  async submitEmpty(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Wait for the error alert to become visible.
   */
  async waitForError(): Promise<void> {
    await this.serverError.waitFor({ state: 'visible' });
  }
}
