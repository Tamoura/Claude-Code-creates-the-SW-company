import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:5004/api";

/**
 * Helper to set up authenticated state and mock the common
 * dashboard endpoints so the page can load without a real backend.
 */
async function setupAuthenticatedState(page: import("@playwright/test").Page) {
  // Inject auth token before navigating
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.setItem("accessToken", "mock-token-123");
  });

  // Mock the profile endpoint used by the dashboard layout
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

test.describe("Invoice Creation Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test("loads with AI prompt input area", async ({ page }) => {
    await page.goto("/dashboard/invoices/new");

    await expect(
      page.getByRole("heading", { name: "Describe your work" })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(
        /describe|hours|web development/i
      )
    ).toBeVisible();
  });

  test("character counter shows 0/2000 initially", async ({ page }) => {
    await page.goto("/dashboard/invoices/new");

    await expect(page.getByText("0/2000")).toBeVisible();
  });

  test("character counter updates as user types", async ({ page }) => {
    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill("Hello world");

    await expect(page.getByText("11/2000")).toBeVisible();
  });

  test("character counter warns when approaching limit", async ({ page }) => {
    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    // Fill with 1950 characters (above 1900 threshold)
    const longText = "A".repeat(1950);
    await textarea.fill(longText);

    await expect(page.getByText("1950/2000")).toBeVisible();
  });

  test("generate button is disabled when input is empty", async ({ page }) => {
    await page.goto("/dashboard/invoices/new");

    const generateButton = page.getByRole("button", {
      name: "Generate Invoice",
    });
    await expect(generateButton).toBeDisabled();
  });

  test("generate button is disabled when input is less than 10 characters", async ({
    page,
  }) => {
    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill("Short");

    const generateButton = page.getByRole("button", {
      name: "Generate Invoice",
    });
    await expect(generateButton).toBeDisabled();

    // Minimum length hint should appear
    await expect(
      page.getByText("At least 10 characters required")
    ).toBeVisible();
  });

  test("generate button is enabled when input has 10+ characters", async ({
    page,
  }) => {
    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill("This is a valid prompt with enough characters.");

    const generateButton = page.getByRole("button", {
      name: "Generate Invoice",
    });
    await expect(generateButton).toBeEnabled();
  });

  test("submitting shows loading state during generation", async ({
    page,
  }) => {
    // Mock the generate endpoint with a delay
    await page.route(`${API_BASE}/invoices/generate`, async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "inv-1",
          invoiceNumber: "INV-001",
          status: "draft",
          client: { id: "c-1", name: "Acme Corp", email: "billing@acme.com", matched: true },
          items: [
            {
              id: "item-1",
              description: "Web Development",
              quantity: 40,
              unitPrice: 12500,
              amount: 500000,
              sortOrder: 0,
            },
          ],
          subtotal: 500000,
          taxRate: 850,
          taxAmount: 42500,
          total: 542500,
          currency: "USD",
          invoiceDate: "2026-01-15",
          dueDate: "2026-01-29",
          notes: "Payment due within 14 days.",
          aiPrompt: "40 hours web dev for Acme at $125/hr",
          shareToken: null,
          paymentLink: null,
          paidAt: null,
          sentAt: null,
          createdAt: "2026-01-15T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
        }),
      });
    });

    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill(
      "I did 40 hours of web development for Acme Corp at $125/hour. Apply 8.5% sales tax."
    );

    await page.getByRole("button", { name: "Generate Invoice" }).click();

    // Loading state should appear
    await expect(
      page.getByText("Generating your invoice...")
    ).toBeVisible();
  });

  test("generated invoice shows preview with client info and line items", async ({
    page,
  }) => {
    // Mock the generate endpoint
    await page.route(`${API_BASE}/invoices/generate`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "inv-1",
          invoiceNumber: "INV-001",
          status: "draft",
          client: {
            id: "c-1",
            name: "Acme Corp",
            email: "billing@acme.com",
            matched: true,
          },
          items: [
            {
              id: "item-1",
              description: "Web Development - Frontend",
              quantity: 20,
              unitPrice: 12500,
              amount: 250000,
              sortOrder: 0,
            },
            {
              id: "item-2",
              description: "Web Development - Backend",
              quantity: 20,
              unitPrice: 12500,
              amount: 250000,
              sortOrder: 1,
            },
          ],
          subtotal: 500000,
          taxRate: 850,
          taxAmount: 42500,
          total: 542500,
          currency: "USD",
          invoiceDate: "2026-01-15",
          dueDate: "2026-01-29",
          notes: "Payment due within 14 days.",
          aiPrompt: "40 hours web dev for Acme at $125/hr",
          shareToken: null,
          paymentLink: null,
          paidAt: null,
          sentAt: null,
          createdAt: "2026-01-15T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
        }),
      })
    );

    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill(
      "I did 40 hours of web development for Acme Corp at $125/hour. Apply 8.5% sales tax."
    );

    await page.getByRole("button", { name: "Generate Invoice" }).click();

    // Preview should show
    await expect(
      page.getByRole("heading", { name: "Invoice Preview" })
    ).toBeVisible();

    // Client info
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("billing@acme.com")).toBeVisible();

    // Line items table headers
    await expect(page.getByText("Description")).toBeVisible();
    await expect(page.getByText("Qty")).toBeVisible();
    await expect(page.getByText("Rate")).toBeVisible();

    // Line item descriptions
    await expect(
      page.getByText("Web Development - Frontend")
    ).toBeVisible();
    await expect(
      page.getByText("Web Development - Backend")
    ).toBeVisible();

    // Action buttons on preview
    await expect(
      page.getByRole("button", { name: "Edit Invoice" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save as Draft" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start Over" })
    ).toBeVisible();
  });

  test("API error during generation shows error message", async ({
    page,
  }) => {
    // Mock the generate endpoint to return an error
    await page.route(`${API_BASE}/invoices/generate`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          message: "AI service temporarily unavailable",
        }),
      })
    );

    await page.goto("/dashboard/invoices/new");

    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill("Generate an invoice for 10 hours of consulting at $200/hr.");

    await page.getByRole("button", { name: "Generate Invoice" }).click();

    await expect(
      page.getByText("AI service temporarily unavailable")
    ).toBeVisible();
  });

  test("'Start Over' button resets form after generation", async ({
    page,
  }) => {
    // Mock the generate endpoint
    await page.route(`${API_BASE}/invoices/generate`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "inv-1",
          invoiceNumber: "INV-001",
          status: "draft",
          client: { id: "c-1", name: "Acme Corp", email: null, matched: false },
          items: [
            {
              id: "item-1",
              description: "Consulting",
              quantity: 10,
              unitPrice: 20000,
              amount: 200000,
              sortOrder: 0,
            },
          ],
          subtotal: 200000,
          taxRate: 0,
          taxAmount: 0,
          total: 200000,
          currency: "USD",
          invoiceDate: "2026-01-15",
          dueDate: "2026-01-29",
          notes: null,
          aiPrompt: "10 hours consulting at $200/hr",
          shareToken: null,
          paymentLink: null,
          paidAt: null,
          sentAt: null,
          createdAt: "2026-01-15T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
        }),
      })
    );

    await page.goto("/dashboard/invoices/new");

    // Fill and generate
    const textarea = page.getByPlaceholder(
      /describe|hours|web development/i
    );
    await textarea.fill("10 hours consulting at $200/hr for Acme Corp.");
    await page.getByRole("button", { name: "Generate Invoice" }).click();

    // Wait for preview
    await expect(
      page.getByRole("heading", { name: "Invoice Preview" })
    ).toBeVisible();

    // Click Start Over
    await page.getByRole("button", { name: "Start Over" }).click();

    // Should return to input form
    await expect(
      page.getByRole("heading", { name: "Describe your work" })
    ).toBeVisible();
    await expect(page.getByText("0/2000")).toBeVisible();
  });
});
