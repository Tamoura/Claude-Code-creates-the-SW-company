import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:5004/api";

const sampleClients = [
  {
    id: "c-1",
    name: "Acme Corp",
    email: "billing@acme.com",
    phone: "+1 555-0101",
    address: "123 Main St",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    country: "USA",
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "c-2",
    name: "Globex Inc",
    email: "ap@globex.com",
    phone: null,
    address: "456 Oak Ave",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA",
    notes: "Preferred payment: wire transfer",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
];

/**
 * Set up authenticated state with common route mocks.
 */
async function setupAuthenticatedState(page: import("@playwright/test").Page) {
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
        subscriptionTier: "pro",
        invoiceCountThisMonth: 2,
        invoiceLimitThisMonth: null,
        stripeConnected: true,
        createdAt: "2025-12-01T00:00:00.000Z",
      }),
    })
  );
}

test.describe("Client Management Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test("loads with heading and 'Add Client' button", async ({ page }) => {
    await page.route(`${API_BASE}/clients*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleClients,
          clients: sampleClients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      })
    );

    await page.goto("/dashboard/clients");

    await expect(
      page.getByRole("heading", { name: "Clients" })
    ).toBeVisible();
    await expect(page.getByText("Manage your client information")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Add Client/i })
    ).toBeVisible();
  });

  test("displays client list with name, email, and location", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/clients*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleClients,
          clients: sampleClients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      })
    );

    await page.goto("/dashboard/clients");

    // Client names
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Globex Inc")).toBeVisible();

    // Client emails
    await expect(page.getByText("billing@acme.com")).toBeVisible();
    await expect(page.getByText("ap@globex.com")).toBeVisible();

    // Client locations (address, city, state, zip)
    await expect(
      page.getByText(/123 Main St.*San Francisco.*CA.*94105/)
    ).toBeVisible();
  });

  test("'Add Client' button toggles the add client form", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/clients*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleClients,
          clients: sampleClients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      })
    );

    await page.goto("/dashboard/clients");

    // Form should not be visible initially
    await expect(
      page.getByRole("heading", { name: "Add New Client" })
    ).not.toBeVisible();

    // Click "Add Client" button
    await page.getByRole("button", { name: /Add Client/i }).first().click();

    // Form should now be visible
    await expect(
      page.getByRole("heading", { name: "Add New Client" })
    ).toBeVisible();
    await expect(page.getByLabel("Client Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
    await expect(page.getByLabel("Address")).toBeVisible();
    await expect(page.getByLabel("City")).toBeVisible();
    await expect(page.getByLabel("State")).toBeVisible();
    await expect(page.getByLabel("ZIP")).toBeVisible();
    await expect(page.getByLabel("Country")).toBeVisible();
  });

  test("submitting add client form calls the API", async ({ page }) => {
    let createClientCalled = false;
    let createClientBody: Record<string, string> = {};

    // Mock the clients list
    await page.route(`${API_BASE}/clients`, (route) => {
      if (route.request().method() === "POST") {
        createClientCalled = true;
        createClientBody = JSON.parse(route.request().postData() || "{}");
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "c-new",
            name: "New Client LLC",
            email: "hello@newclient.com",
            phone: null,
            address: null,
            city: null,
            state: null,
            zip: null,
            country: null,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      // GET request
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleClients,
          clients: sampleClients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      });
    });

    // Also handle clients with query params
    await page.route(`${API_BASE}/clients?*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleClients,
          clients: sampleClients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      })
    );

    await page.goto("/dashboard/clients");

    // Open the form
    await page.getByRole("button", { name: /Add Client/i }).first().click();

    // Fill in the form
    await page.getByLabel("Client Name").fill("New Client LLC");
    await page.getByLabel("Email").fill("hello@newclient.com");

    // Submit the form -- the "Add Client" button inside the form
    // (the second "Add Client" button, after the one in the header)
    const addButtons = page.getByRole("button", { name: /Add Client/i });
    await addButtons.last().click();

    // Wait for the request
    await page.waitForTimeout(500);

    expect(createClientCalled).toBe(true);
    expect(createClientBody.name).toBe("New Client LLC");
    expect(createClientBody.email).toBe("hello@newclient.com");
  });

  test("cancel button hides the add client form", async ({ page }) => {
    await page.route(`${API_BASE}/clients*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleClients,
          clients: sampleClients,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      })
    );

    await page.goto("/dashboard/clients");

    // Open the form
    await page.getByRole("button", { name: /Add Client/i }).first().click();
    await expect(
      page.getByRole("heading", { name: "Add New Client" })
    ).toBeVisible();

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Form should be hidden again
    await expect(
      page.getByRole("heading", { name: "Add New Client" })
    ).not.toBeVisible();
  });

  test("empty state shows message when no clients exist", async ({
    page,
  }) => {
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

    await page.goto("/dashboard/clients");

    await expect(page.getByText("No clients yet")).toBeVisible();
    await expect(
      page.getByText("Add your first client to get started!")
    ).toBeVisible();
  });

  test("search input filters clients", async ({ page }) => {
    let lastRequestUrl = "";

    await page.route(`${API_BASE}/clients*`, (route) => {
      lastRequestUrl = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [sampleClients[0]],
          clients: [sampleClients[0]],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto("/dashboard/clients");

    // Wait for initial load
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();

    // Fill in search and click Search button
    const searchInput = page.getByPlaceholder("Search clients...");
    await searchInput.fill("Acme");
    await page.getByRole("button", { name: "Search" }).click();

    // Wait for the filtered request
    await page.waitForTimeout(300);

    expect(lastRequestUrl).toContain("search=Acme");
  });
});
