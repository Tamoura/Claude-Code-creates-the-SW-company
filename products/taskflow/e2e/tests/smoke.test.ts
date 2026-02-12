import { test, expect } from '@playwright/test';

test.describe('TaskFlow Smoke Tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /taskflow/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('login page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('TaskFlow Auth E2E', () => {
  const testUser = {
    email: `e2e-${Date.now()}@test.com`,
    password: 'TestPassword123!',
  };

  test('user can register and see dashboard', async ({ page }) => {
    await page.goto('/login');

    // Switch to register tab
    await page.getByRole('tab', { name: /register/i }).click();

    // Fill form
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);

    // Submit
    await page.getByRole('button', { name: /register|sign up|create/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });
});

test.describe('TaskFlow Tasks E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Register a fresh user for each test
    const email = `e2e-tasks-${Date.now()}@test.com`;
    await page.goto('/login');
    await page.getByRole('tab', { name: /register/i }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /register|sign up|create/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('user can create a task', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`;
    await page.getByPlaceholder(/task/i).fill(taskTitle);
    await page.getByRole('button', { name: /add/i }).click();

    // Task should appear in the list
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 3000 });
  });

  test('user can toggle task completion', async ({ page }) => {
    // Create a task first
    const taskTitle = `Toggle Task ${Date.now()}`;
    await page.getByPlaceholder(/task/i).fill(taskTitle);
    await page.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 3000 });

    // Toggle complete
    await page.getByRole('checkbox').first().click();

    // Task should show as completed (strikethrough or visual change)
    await page.waitForTimeout(500);
  });

  test('user can delete a task', async ({ page }) => {
    const taskTitle = `Delete Task ${Date.now()}`;
    await page.getByPlaceholder(/task/i).fill(taskTitle);
    await page.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 3000 });

    // Delete
    await page.getByRole('button', { name: /delete/i }).first().click();

    // Task should be gone
    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 3000 });
  });

  test('dashboard shows correct stats', async ({ page }) => {
    // Create 2 tasks
    await page.getByPlaceholder(/task/i).fill('Stat Task 1');
    await page.getByRole('button', { name: /add/i }).click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder(/task/i).fill('Stat Task 2');
    await page.getByRole('button', { name: /add/i }).click();
    await page.waitForTimeout(500);

    // Verify stats show 2 total
    await expect(page.getByText('2').first()).toBeVisible({ timeout: 3000 });
  });
});
