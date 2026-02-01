import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("clicking Pricing link navigates to pricing page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Pricing" }).first().click();

    await expect(page).toHaveURL(/\/pricing/);
    await expect(
      page.getByRole("heading", { name: /pricing/i })
    ).toBeVisible();
  });

  test("login page loads with form", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();
  });

  test("signup page loads with form", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();

    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" })
    ).toBeVisible();
  });
});
