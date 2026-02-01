import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:5004/api";

/**
 * Set up authenticated state with all common route mocks needed
 * to navigate the full dashboard without a live backend.
 */
async function setupAuthenticatedState(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.setItem("accessToken", "mock-token-123");
  });

  // Profile (used by dashboard layout)
  await page.route(`${API_BASE}/users/me`, (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          businessName: null,
          subscriptionTier: "free",
          invoiceCountThisMonth: 2,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        businessName: null,
        subscriptionTier: "free",
        invoiceCountThisMonth: 2,
        invoiceLimitThisMonth: 5,
        stripeConnected: false,
        createdAt: "2025-12-01T00:00:00.000Z",
      }),
    });
  });

  // Invoices list (used by dashboard and invoices page)
  await page.route(`${API_BASE}/invoices*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: {
          totalOutstanding: 0,
          paidThisMonth: 0,
          invoicesThisMonth: 0,
        },
      }),
    })
  );

  // Clients list (used by clients page)
  await page.route(`${API_BASE}/clients*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [],
        clients: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    })
  );
}

test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test("sidebar has all expected navigation links", async ({ page }) => {
    await page.goto("/dashboard");

    // All sidebar navigation items should be present
    await expect(
      page.getByRole("link", { name: "Dashboard" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Invoices" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Clients" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Settings" })
    ).toBeVisible();
  });

  test("Dashboard link navigates to dashboard page", async ({ page }) => {
    await page.goto("/dashboard/invoices");
    await expect(
      page.getByRole("heading", { name: "Invoices" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("Invoices link navigates to invoices list", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Invoices" }).click();

    await expect(page).toHaveURL(/\/dashboard\/invoices/);
    await expect(
      page.getByRole("heading", { name: "Invoices" })
    ).toBeVisible();
  });

  test("Clients link navigates to clients page", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Clients" }).click();

    await expect(page).toHaveURL(/\/dashboard\/clients/);
    await expect(
      page.getByRole("heading", { name: "Clients" })
    ).toBeVisible();
  });

  test("Settings link navigates to settings page", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Settings" }).click();

    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
  });
});

test.describe("Dashboard Summary", () => {
  test("dashboard summary cards render with stats", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          businessName: null,
          subscriptionTier: "pro",
          invoiceCountThisMonth: 5,
          invoiceLimitThisMonth: null,
          stripeConnected: true,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

    await page.route(`${API_BASE}/invoices*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
          summary: {
            totalOutstanding: 250000,
            paidThisMonth: 1100000,
            invoicesThisMonth: 5,
          },
        }),
      })
    );

    await page.goto("/dashboard");

    // Summary cards text
    await expect(page.getByText("Total Outstanding")).toBeVisible();
    await expect(page.getByText("Paid This Month")).toBeVisible();
    await expect(page.getByText("Invoices This Month")).toBeVisible();
  });

  test("dashboard shows 'New Invoice' button", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          subscriptionTier: "free",
          invoiceCountThisMonth: 0,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

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

    await page.goto("/dashboard");

    await expect(
      page.getByRole("link", { name: /New Invoice/i })
    ).toBeVisible();
  });

  test("dashboard quick actions section has links", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          subscriptionTier: "free",
          invoiceCountThisMonth: 0,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

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

    await page.goto("/dashboard");

    // Quick Actions section
    await expect(
      page.getByRole("heading", { name: "Quick Actions" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Create New Invoice/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Manage Clients/i })
    ).toBeVisible();
  });

  test("dashboard shows user info in top bar", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          subscriptionTier: "free",
          invoiceCountThisMonth: 0,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

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

    await page.goto("/dashboard");

    // User name and email in the top bar
    await expect(page.getByText("Test User")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();

    // User initials avatar (TU)
    await expect(page.getByText("TU")).toBeVisible();
  });
});

test.describe("Settings Page", () => {
  test("settings page loads with profile and stripe sections", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          businessName: "Test LLC",
          subscriptionTier: "free",
          invoiceCountThisMonth: 2,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

    await page.goto("/dashboard/settings");

    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
    await expect(page.getByText("Manage your account and preferences")).toBeVisible();

    // Profile section
    await expect(
      page.getByRole("heading", { name: "Profile Information" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel(/Business Name/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeVisible();

    // Payment Processing section
    await expect(
      page.getByRole("heading", { name: "Payment Processing" })
    ).toBeVisible();

    // Invoice Usage section
    await expect(
      page.getByRole("heading", { name: "Invoice Usage" })
    ).toBeVisible();
  });

  test("settings page shows Stripe connect button when not connected", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          businessName: null,
          subscriptionTier: "free",
          invoiceCountThisMonth: 0,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

    await page.goto("/dashboard/settings");

    await expect(page.getByText("Enable Online Payments")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Connect Stripe Account/i })
    ).toBeVisible();
  });

  test("settings shows upgrade prompt for free tier users", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("accessToken", "mock-token-123");
    });

    await page.route(`${API_BASE}/users/me`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          businessName: null,
          subscriptionTier: "free",
          invoiceCountThisMonth: 3,
          invoiceLimitThisMonth: 5,
          stripeConnected: false,
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      })
    );

    await page.goto("/dashboard/settings");

    await expect(
      page.getByText("Upgrade for unlimited invoices")
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Plans" })
    ).toBeVisible();
  });
});

test.describe("Marketing Page Navigation", () => {
  test("landing page header has navigation links", async ({ page }) => {
    await page.goto("/");

    // Header navigation
    await expect(
      page.getByRole("link", { name: "Features" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Pricing" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Login" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign Up" })
    ).toBeVisible();
  });

  test("'Get Started Free' CTA navigates to signup", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Get Started Free" }).click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();
  });

  test("pricing page loads with plan tiers", async ({ page }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", { name: /pricing/i }).first()
    ).toBeVisible();

    // Plan tiers
    await expect(
      page.getByRole("heading", { name: "Free" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pro" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Team" })
    ).toBeVisible();

    // Prices
    await expect(page.getByText("$0")).toBeVisible();
    await expect(page.getByText("$9")).toBeVisible();
    await expect(page.getByText("$29")).toBeVisible();
  });
});
