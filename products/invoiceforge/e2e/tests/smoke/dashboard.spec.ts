import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("dashboard page loads with layout", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("404 page displays for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });
});
