import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Pulse login page (/login).
 *
 * Encapsulates selectors and actions for the login form,
 * GitHub OAuth button, and navigation links.
 */
export class LoginPage {
  readonly page: Page;

  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;

  // OAuth
  readonly githubButton: Locator;

  // Navigation links
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly logoLink: Locator;

  // Feedback
  readonly errorMessage: Locator;

  // Page headings
  readonly heading: Locator;
  readonly subtitle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.rememberMeCheckbox = page.getByLabel(/remember me/i);

    this.githubButton = page.getByRole('button', {
      name: /continue with github/i,
    });

    this.forgotPasswordLink = page.getByRole('link', {
      name: /forgot password/i,
    });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.logoLink = page.getByRole('link', { name: /pulse/i });

    this.errorMessage = page.locator('[class*="bg-red"]');

    this.heading = page.getByRole('heading', { name: /welcome back/i });
    this.subtitle = page.getByText(/sign in to your account/i);
  }

  /** Navigate to the login page */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /** Fill in the login form and submit */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Assert the page has loaded correctly */
  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.githubButton).toBeVisible();
  }

  /** Assert an error message is displayed */
  async expectError(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}
