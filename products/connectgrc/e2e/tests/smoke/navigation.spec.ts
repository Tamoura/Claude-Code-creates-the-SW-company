import { test, expect } from '@playwright/test';
import { LandingPage, LoginPage, RegisterPage } from '../../pages';
import { HEADER_NAV_LINKS } from '../../fixtures/test-data';

/**
 * Smoke tests: navigation flows between pages.
 *
 * Validates that links, buttons, and redirects work correctly
 * across the public site and auth pages.
 */

test.describe('Smoke: Header Navigation', () => {
  test('header nav links navigate to correct pages', async ({ page }) => {
    await page.goto('/');

    for (const link of HEADER_NAV_LINKS) {
      // Navigate back to home first
      await page.goto('/');

      const navLink = page.locator(`header a[href="${link.href}"]`).first();
      // Desktop nav links are hidden on mobile via md:flex
      if (await navLink.isVisible()) {
        await navLink.click();
        await expect(page).toHaveURL(link.href);
      }
    }
  });

  test('header Sign In link goes to /login', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.navigateToLogin();
  });

  test('header Get Started link goes to /register', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.navigateToRegister();
  });
});

test.describe('Smoke: Landing Page CTAs', () => {
  test('hero Get Started Free goes to /register', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expectHeroVisible();
    await landing.navigateToRegister();
  });

  test('hero Learn More goes to /how-it-works', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.navigateToHowItWorks();
  });

  test('CTA section Create Your Free Account goes to /register', async ({ page }) => {
    await page.goto('/');
    const ctaLink = page.locator('section').last().locator('a[href="/register"]');
    if (await ctaLink.isVisible()) {
      await ctaLink.click();
      await expect(page).toHaveURL('/register');
    }
  });
});

test.describe('Smoke: Auth Page Cross-Links', () => {
  test('login page links to register [FR-AUTH-01]', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.navigateToRegister();
  });

  test('login page links to forgot password [FR-AUTH-08]', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.navigateToForgotPassword();
  });

  test('register page links to login', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.navigateToLogin();
  });
});
