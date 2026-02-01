import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/InvoiceForge/);
  });

  test("has Get Started Free CTA button", async ({ page }) => {
    await page.goto("/");

    const ctaButton = page.getByRole("link", { name: "Get Started Free" });
    await expect(ctaButton).toBeVisible();
  });

  test("shows feature highlights", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "AI Generation" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Payment Links" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "PDF Export" })
    ).toBeVisible();
  });
});
