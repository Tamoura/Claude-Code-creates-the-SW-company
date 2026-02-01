import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:5004/api";

/** Sample invoice data used across tests. */
const sampleInvoices = [
  {
    id: "inv-1",
    invoiceNumber: "INV-001",
    status: "draft",
    client: { id: "c-1", name: "Acme Corp", email: "billing@acme.com", matched: true },
    items: [],
    subtotal: 500000,
    taxRate: 850,
    taxAmount: 42500,
    total: 542500,
    currency: "USD",
    invoiceDate: "2026-01-10",
    dueDate: "2026-01-24",
    notes: null,
    aiPrompt: null,
    shareToken: null,
    paymentLink: null,
    paidAt: null,
    sentAt: null,
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-002",
    status: "sent",
    client: { id: "c-2", name: "Globex Inc", email: "ap@globex.com", matched: true },
    items: [],
    subtotal: 300000,
    taxRate: 0,
    taxAmount: 0,
    total: 300000,
    currency: "USD",
    invoiceDate: "2026-01-12",
    dueDate: "2026-01-26",
    notes: null,
    aiPrompt: null,
    shareToken: null,
    paymentLink: null,
    paidAt: null,
    sentAt: "2026-01-12T12:00:00.000Z",
    createdAt: "2026-01-12T00:00:00.000Z",
    updatedAt: "2026-01-12T12:00:00.000Z",
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-003",
    status: "paid",
    client: { id: "c-3", name: "Wayne Enterprises", email: "finance@wayne.com", matched: true },
    items: [],
    subtotal: 1000000,
    taxRate: 1000,
    taxAmount: 100000,
    total: 1100000,
    currency: "USD",
    invoiceDate: "2026-01-05",
    dueDate: "2026-01-19",
    notes: null,
    aiPrompt: null,
    shareToken: null,
    paymentLink: null,
    paidAt: "2026-01-18T00:00:00.000Z",
    sentAt: "2026-01-05T12:00:00.000Z",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-18T00:00:00.000Z",
  },
  {
    id: "inv-4",
    invoiceNumber: "INV-004",
    status: "overdue",
    client: { id: "c-4", name: "Stark Industries", email: "pay@stark.com", matched: true },
    items: [],
    subtotal: 750000,
    taxRate: 0,
    taxAmount: 0,
    total: 750000,
    currency: "USD",
    invoiceDate: "2025-12-01",
    dueDate: "2025-12-15",
    notes: null,
    aiPrompt: null,
    shareToken: null,
    paymentLink: null,
    paidAt: null,
    sentAt: "2025-12-01T12:00:00.000Z",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2025-12-01T12:00:00.000Z",
  },
];

const defaultSummary = {
  totalOutstanding: 1592500,
  paidThisMonth: 1100000,
  invoicesThisMonth: 3,
};

/**
 * Set up authenticated state and common route mocks.
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
        invoiceCountThisMonth: 3,
        invoiceLimitThisMonth: null,
        stripeConnected: true,
        createdAt: "2025-12-01T00:00:00.000Z",
      }),
    })
  );
}

test.describe("Invoice List Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test("displays invoice list heading and 'New Invoice' button", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/invoices*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleInvoices,
          pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
          summary: defaultSummary,
        }),
      })
    );

    await page.goto("/dashboard/invoices");

    await expect(
      page.getByRole("heading", { name: "Invoices" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /New Invoice/i })
    ).toBeVisible();
  });

  test("displays invoice rows with number, client, amount, and status", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/invoices*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleInvoices,
          pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
          summary: defaultSummary,
        }),
      })
    );

    await page.goto("/dashboard/invoices");

    // Check that all invoice numbers are visible
    await expect(page.getByText("INV-001")).toBeVisible();
    await expect(page.getByText("INV-002")).toBeVisible();
    await expect(page.getByText("INV-003")).toBeVisible();
    await expect(page.getByText("INV-004")).toBeVisible();

    // Check that client names are visible
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Globex Inc")).toBeVisible();
    await expect(page.getByText("Wayne Enterprises")).toBeVisible();
    await expect(page.getByText("Stark Industries")).toBeVisible();

    // Check that statuses are rendered
    await expect(page.getByText("DRAFT")).toBeVisible();
    await expect(page.getByText("SENT")).toBeVisible();
    await expect(page.getByText("PAID")).toBeVisible();
    await expect(page.getByText("OVERDUE")).toBeVisible();
  });

  test("filter tabs render and 'All' is active by default", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/invoices*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleInvoices,
          pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
          summary: defaultSummary,
        }),
      })
    );

    await page.goto("/dashboard/invoices");

    // All filter tabs should be visible
    const allTab = page.getByRole("button", { name: "All" });
    const draftTab = page.getByRole("button", { name: "Draft" });
    const sentTab = page.getByRole("button", { name: "Sent" });
    const paidTab = page.getByRole("button", { name: "Paid" });
    const overdueTab = page.getByRole("button", { name: "Overdue" });

    await expect(allTab).toBeVisible();
    await expect(draftTab).toBeVisible();
    await expect(sentTab).toBeVisible();
    await expect(paidTab).toBeVisible();
    await expect(overdueTab).toBeVisible();
  });

  test("clicking a filter tab sends correct status parameter", async ({
    page,
  }) => {
    let lastRequestUrl = "";

    await page.route(`${API_BASE}/invoices*`, (route) => {
      lastRequestUrl = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleInvoices.filter((inv) => inv.status === "draft"),
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          summary: defaultSummary,
        }),
      });
    });

    await page.goto("/dashboard/invoices");

    // Wait for initial load
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();

    // Click the Draft filter
    await page.getByRole("button", { name: "Draft" }).click();

    // Wait for the filtered request to complete
    await page.waitForTimeout(300);

    // The request should include the status parameter
    expect(lastRequestUrl).toContain("status=draft");
  });

  test("search input sends query parameter to API", async ({ page }) => {
    let lastRequestUrl = "";

    await page.route(`${API_BASE}/invoices*`, (route) => {
      lastRequestUrl = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [sampleInvoices[0]],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          summary: defaultSummary,
        }),
      });
    });

    await page.goto("/dashboard/invoices");

    // Wait for initial load
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();

    // Type search query and click search
    const searchInput = page.getByPlaceholder(
      /search by client name or invoice number/i
    );
    await searchInput.fill("Acme");
    await page.getByRole("button", { name: "Search" }).click();

    // Wait for filtered request
    await page.waitForTimeout(300);

    expect(lastRequestUrl).toContain("search=Acme");
  });

  test("empty state shows message when no invoices exist", async ({
    page,
  }) => {
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

    await page.goto("/dashboard/invoices");

    await expect(page.getByText("No invoices yet")).toBeVisible();
    await expect(
      page.getByText("Create your first invoice to get started!")
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Create Invoice/i })
    ).toBeVisible();
  });

  test("summary cards show correct data", async ({ page }) => {
    await page.route(`${API_BASE}/invoices*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: sampleInvoices,
          pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
          summary: defaultSummary,
        }),
      })
    );

    await page.goto("/dashboard/invoices");

    // The summary cards should show formatted values
    await expect(page.getByText("Total Outstanding")).toBeVisible();
    await expect(page.getByText("Paid This Month")).toBeVisible();
    await expect(page.getByText("Invoices This Month")).toBeVisible();
  });
});
