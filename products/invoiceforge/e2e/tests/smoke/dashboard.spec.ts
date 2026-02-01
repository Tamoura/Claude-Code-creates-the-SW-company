import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("unauthenticated user sees login page when visiting dashboard", async ({
    page,
  }) => {
    // Visit dashboard without auth — guard shows Loading then redirects
    await page.goto("/dashboard");

    // The auth guard uses router.replace('/login') which is client-side.
    // Wait for the login heading to appear (guard redirect + page render).
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible({ timeout: 15000 });
  });

  test("dashboard page loads after login via UI", async ({ page }) => {
    // Register a user via API first
    const apiBase = "http://localhost:5004/api";
    const email = `e2e-${Date.now()}@test.com`;
    await page.request.post(`${apiBase}/auth/register`, {
      data: { name: "E2E User", email, password: "TestPass123!" },
    });

    // Login through the actual UI
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should redirect to dashboard after successful login
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible({ timeout: 20000 });
  });

  test("404 page displays for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });
});
