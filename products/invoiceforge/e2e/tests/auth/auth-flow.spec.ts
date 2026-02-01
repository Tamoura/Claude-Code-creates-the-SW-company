import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:5004/api";

test.describe("Authentication Flow", () => {
  test.describe("Login Page", () => {
    test("renders login form with all fields", async ({ page }) => {
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

    test("shows link to sign up page", async ({ page }) => {
      await page.goto("/login");

      const signUpLink = page.getByRole("link", { name: "Sign up" });
      await expect(signUpLink).toBeVisible();
      await expect(signUpLink).toHaveAttribute("href", "/signup");
    });

    test("login with invalid credentials shows error", async ({ page }) => {
      // Mock the login API to return a 401
      await page.route(`${API_BASE}/auth/login`, (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Invalid email or password" }),
        })
      );

      await page.goto("/login");

      await page.getByLabel("Email").fill("bad@example.com");
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(
        page.getByText("Invalid email or password")
      ).toBeVisible();
    });

    test("login button shows loading state during submission", async ({
      page,
    }) => {
      // Mock the login API with a delayed response
      await page.route(`${API_BASE}/auth/login`, async (route) => {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "1", name: "Test User", email: "test@example.com" },
            accessToken: "mock-token",
          }),
        });
      });

      await page.goto("/login");

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(
        page.getByRole("button", { name: "Signing in..." })
      ).toBeVisible();
    });

    test("successful login redirects to dashboard", async ({ page }) => {
      // Mock the login API
      await page.route(`${API_BASE}/auth/login`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "1",
              name: "Test User",
              email: "test@example.com",
              subscriptionTier: "free",
              invoiceCountThisMonth: 0,
              invoiceLimitThisMonth: 5,
              stripeConnected: false,
              createdAt: new Date().toISOString(),
            },
            accessToken: "mock-token-123",
          }),
        })
      );

      // Mock the profile endpoint that the dashboard layout calls
      await page.route(`${API_BASE}/users/me`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "1",
            name: "Test User",
            email: "test@example.com",
            subscriptionTier: "free",
            invoiceCountThisMonth: 0,
            invoiceLimitThisMonth: 5,
            stripeConnected: false,
            createdAt: new Date().toISOString(),
          }),
        })
      );

      // Mock the invoices list that the dashboard page calls
      await page.route(`${API_BASE}/invoices*`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
            summary: {
              totalOutstanding: 0,
              paidThisMonth: 0,
              invoicesThisMonth: 0,
            },
          }),
        })
      );

      await page.goto("/login");

      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe("Signup Page", () => {
    test("renders signup form with all fields", async ({ page }) => {
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

    test("shows link to login page", async ({ page }) => {
      await page.goto("/signup");

      const signInLink = page.getByRole("link", { name: "Sign in" });
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveAttribute("href", "/login");
    });

    test("signup with existing email shows error", async ({ page }) => {
      // Mock the register API to return a conflict
      await page.route(`${API_BASE}/auth/register`, (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ message: "Email already in use" }),
        })
      );

      await page.goto("/signup");

      await page.getByLabel("Full Name").fill("Test User");
      await page.getByLabel("Email").fill("existing@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByText("Email already in use")).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test("logout clears session and redirects to login", async ({ page }) => {
      // Set up authenticated state by injecting token
      await page.goto("/login");
      await page.evaluate(() => {
        localStorage.setItem("accessToken", "mock-token-123");
      });

      // Mock the profile endpoint
      await page.route(`${API_BASE}/users/me`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "1",
            name: "Test User",
            email: "test@example.com",
            subscriptionTier: "free",
            invoiceCountThisMonth: 0,
            invoiceLimitThisMonth: 5,
            stripeConnected: false,
            createdAt: new Date().toISOString(),
          }),
        })
      );

      // Mock the invoices list that the dashboard page calls
      await page.route(`${API_BASE}/invoices*`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
            summary: {
              totalOutstanding: 0,
              paidThisMonth: 0,
              invoicesThisMonth: 0,
            },
          }),
        })
      );

      // Mock the logout API
      await page.route(`${API_BASE}/auth/logout`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        })
      );

      // Navigate to dashboard
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard" })
      ).toBeVisible();

      // Click logout button in sidebar
      await page.getByRole("button", { name: "Logout" }).click();

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);

      // Verify token is cleared
      const token = await page.evaluate(() =>
        localStorage.getItem("accessToken")
      );
      expect(token).toBeNull();
    });
  });
});
