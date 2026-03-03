/**
 * pages/LoginPage.ts — Page Object Model for the login page (/login)
 *
 * Labels used in the form (from i18n):
 *   - 'Email address'   → email input
 *   - 'Password'        → password input
 *   - 'Sign In'         → submit button
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly serverError: Locator;
  readonly registerLink: Locator;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    // Labels come from i18n: 'Email address' and 'Password'
    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.serverError = page.locator('[role="alert"]');
    this.registerLink = page.getByRole('link', { name: /create account|register|get started/i });
    this.pageHeading = page.locator('h1, h2').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Fill and submit the login form.
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Fill in invalid credentials and submit.
   */
  async loginWithInvalidCredentials(): Promise<void> {
    await this.login('nobody@nowhere.example.com', 'WrongPass999!');
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
