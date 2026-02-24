import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('landing page loads with ArchForge branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ArchForge/i);
    await expect(page.getByText('ArchForge')).toBeVisible();
  });

  test('landing page shows hero section', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Describe Systems/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Get Started/i }).first(),
    ).toBeVisible();
  });

  test('login page renders form', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: /Welcome back/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sign in/i }),
    ).toBeVisible();
  });

  test('register page renders form', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: /Create your account/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Full name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/Confirm password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Create account/i }),
    ).toBeVisible();
  });

  test('API health endpoint returns 200', async ({ request }) => {
    const response = await request.get('http://localhost:5012/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test('navigation links are present on landing page', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: /Sign In/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Get Started/i }).first(),
    ).toBeVisible();
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /Create one free/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.getByRole('link', { name: /Sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });
});
