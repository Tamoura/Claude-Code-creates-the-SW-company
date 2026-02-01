import { type Page, expect } from "@playwright/test";

/**
 * Wait for a page to finish loading by checking the network is idle.
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Navigate to a route and wait for the page to load.
 * Uses relative paths which combine with baseURL from config.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Assert that an element with the given text is visible on the page.
 */
export async function expectTextVisible(
  page: Page,
  text: string
): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible();
}

/**
 * Assert that a link with the given name is visible on the page.
 */
export async function expectLinkVisible(
  page: Page,
  name: string
): Promise<void> {
  await expect(page.getByRole("link", { name }).first()).toBeVisible();
}

/**
 * Assert that a heading with the given text is visible on the page.
 */
export async function expectHeadingVisible(
  page: Page,
  name: string
): Promise<void> {
  await expect(page.getByRole("heading", { name }).first()).toBeVisible();
}
