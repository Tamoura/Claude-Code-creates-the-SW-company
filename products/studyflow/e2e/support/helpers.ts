import { expect, type Page } from '@playwright/test';

/**
 * Shared E2E helpers for StudyFlow. These drive the REAL UI against the real
 * stack — no mocks, no direct DB writes. Each test creates its own fresh user
 * via the signup form so runs never collide on the shared `studyflow_dev` DB.
 */

let counter = 0;

/** A unique, valid login email for a single test run. */
export function uniqueEmail(prefix = 'e2e'): string {
  counter += 1;
  return `${prefix}+${Date.now()}-${counter}@studyflow.test`;
}

/** A password that satisfies the ≥8 char policy (FR-001). */
export const DEFAULT_PASSWORD = 'StudyFlow123';

/** ISO date (YYYY-MM-DD) `days` from today. Negative = past. */
export function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface TestUser {
  email: string;
  password: string;
}

/**
 * Sign up a brand-new account via the signup UI (US-01 AC-1). Returns the
 * credentials. Lands on /dashboard with a live session cookie.
 */
export async function signupNewUser(
  page: Page,
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const user: TestUser = {
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? DEFAULT_PASSWORD,
  };

  await page.goto('/signup');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  return user;
}

/** Log in an existing account via the login UI (US-01 AC-3). */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

/**
 * From the catalog, add a named subject (by code, e.g. "CS101") to the plan.
 * Acknowledges the advisory prerequisite confirm() dialog if it appears.
 */
export async function addSubjectToPlan(
  page: Page,
  code: string,
  { acceptPrereq = true }: { acceptPrereq?: boolean } = {}
): Promise<void> {
  // Auto-handle ONLY the advisory prereq confirm() dialog (US-13 AC-1/AC-3).
  // The handler self-removes after firing so it never leaks into later tests
  // (subjects without prereqs raise no dialog at all).
  const onDialog = (dialog: import('@playwright/test').Dialog) => {
    if (!/unmet prerequisites/i.test(dialog.message())) return;
    page.off('dialog', onDialog);
    if (acceptPrereq) void dialog.accept();
    else void dialog.dismiss();
  };
  page.on('dialog', onDialog);

  await page.goto('/catalog');
  await page.getByLabel('Search subjects').fill(code);
  await page.getByRole('button', { name: 'Search' }).click();

  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByText(code, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Add to my plan' }).click();

  // Confirm the API call settled — either "Added", "Already in your plan",
  // or "Not added" (if the prereq dialog was dismissed).
  await expect(
    card.getByText(/Added to your plan|Already in your plan|Not added/)
  ).toBeVisible({ timeout: 10_000 });

  // Ensure the prereq handler does not leak past this helper.
  page.off('dialog', onDialog);
}
