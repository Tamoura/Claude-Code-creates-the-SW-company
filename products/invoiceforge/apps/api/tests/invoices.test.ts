import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb, prisma } from './setup';
import {
  setAnthropicClient,
} from '../src/modules/invoices/ai-service';

let app: FastifyInstance;

const validUser = {
  email: 'invoicetest@example.com',
  password: 'SecurePass123!',
  name: 'Invoice Test User',
};

// Fake Anthropic client for testing
function createFakeAnthropicClient(
  overrides: Record<string, unknown> = {}
) {
  const defaultResult = {
    clientName: 'Acme Corp',
    clientEmail: 'billing@acme.com',
    items: [
      {
        description: 'Web Development',
        quantity: 10,
        unitPrice: 15000,
        unitType: 'hours',
      },
    ],
    taxRate: 850,
    dueDate: null,
    notes: 'Thank you for your business',
    ...overrides,
  };

  return {
    messages: {
      create: async () => ({
        content: [
          {
            type: 'tool_use',
            name: 'create_invoice',
            input: defaultResult,
          },
        ],
      }),
    },
  } as unknown;
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function registerUser(
  application: FastifyInstance,
  email = validUser.email
) {
  const res = await application.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { ...validUser, email },
  });
  const body = res.json();
  return { token: body.accessToken, userId: body.user.id };
}

async function generateInvoice(
  application: FastifyInstance,
  token: string,
  prompt = 'Invoice Acme Corp for 10 hours of web development at $150/hour plus 8.5% tax'
) {
  return application.inject({
    method: 'POST',
    url: '/api/invoices/generate',
    headers: authHeader(token),
    payload: { prompt },
  });
}

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  setAnthropicClient(null);
  await app.close();
  await closeDb();
});

describe('Invoice generation and math', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
    userId = auth.userId;
  });

  it('should generate an invoice from a prompt', async () => {
    const response = await generateInvoice(app, accessToken);

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.invoiceNumber).toBe('INV-0001');
    expect(body.status).toBe('draft');
    expect(body.items).toHaveLength(1);
    expect(body.items[0].description).toBe('Web Development');
    expect(body.items[0].quantity).toBe(10);
    expect(body.items[0].unitPrice).toBe(15000);
    expect(body.notes).toBe('Thank you for your business');
    expect(body.aiPrompt).toBeDefined();
  });

  it('should recalculate math server-side', async () => {
    const response = await generateInvoice(app, accessToken);
    const body = response.json();

    // 10 * 15000 = 150000 cents ($1,500.00)
    expect(body.subtotal).toBe(150000);
    // 150000 * 850 / 10000 = 12750 cents ($127.50)
    expect(body.taxAmount).toBe(12750);
    // 150000 + 12750 = 162750 cents ($1,627.50)
    expect(body.total).toBe(162750);
    expect(body.items[0].amount).toBe(150000);
  });

  it('should generate sequential invoice numbers', async () => {
    const res1 = await generateInvoice(app, accessToken);
    expect(res1.json().invoiceNumber).toBe('INV-0001');

    const res2 = await generateInvoice(app, accessToken);
    expect(res2.json().invoiceNumber).toBe('INV-0002');

    const res3 = await generateInvoice(app, accessToken);
    expect(res3.json().invoiceNumber).toBe('INV-0003');
  });

  it('should reject prompts that are too short', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invoices/generate',
      headers: authHeader(accessToken),
      payload: { prompt: 'short' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invoices/generate',
      payload: { prompt: 'Invoice for 10 hours of work' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should set default due date to Net 30', async () => {
    const response = await generateInvoice(app, accessToken);
    const body = response.json();

    const dueDate = new Date(body.dueDate);
    const now = new Date();
    const diffDays = Math.round(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('should auto-create client when no match found', async () => {
    setAnthropicClient(createFakeAnthropicClient({
      clientName: 'Brand New Company',
      clientEmail: 'new@company.com',
    }) as never);

    const response = await generateInvoice(app, accessToken);
    const body = response.json();

    expect(body.client).toBeDefined();
    expect(body.client.name).toBe('Brand New Company');
  });

  it('should handle multi-item invoices with math', async () => {
    setAnthropicClient(createFakeAnthropicClient({
      items: [
        {
          description: 'Design',
          quantity: 8,
          unitPrice: 12500,
          unitType: 'hours',
        },
        {
          description: 'Development',
          quantity: 20,
          unitPrice: 15000,
          unitType: 'hours',
        },
      ],
      taxRate: 0,
    }) as never);

    const response = await generateInvoice(app, accessToken);
    const body = response.json();

    expect(body.subtotal).toBe(400000);
    expect(body.taxAmount).toBe(0);
    expect(body.total).toBe(400000);
    expect(body.items.length).toBe(2);
    expect(body.items[0].amount).toBe(100000);
    expect(body.items[1].amount).toBe(300000);
  });

  it('should handle tax rate as basis points correctly', async () => {
    setAnthropicClient(createFakeAnthropicClient({
      items: [
        {
          description: 'Service',
          quantity: 1,
          unitPrice: 10000,
          unitType: 'flat',
        },
      ],
      taxRate: 750,
    }) as never);

    const response = await generateInvoice(app, accessToken);
    const body = response.json();

    expect(body.subtotal).toBe(10000);
    expect(body.taxAmount).toBe(750);
    expect(body.total).toBe(10750);
  });
});

describe('Subscription limits', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
    userId = auth.userId;
  });

  it('should enforce free tier limit of 5/month', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await generateInvoice(app, accessToken);
      expect(res.statusCode).toBe(201);
    }

    const res6 = await generateInvoice(app, accessToken);
    expect(res6.statusCode).toBe(402);
    expect(res6.json().error).toBe('SUBSCRIPTION_LIMIT');
  });

  it('should reset counter when month changes', async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    await prisma.user.update({
      where: { id: userId },
      data: {
        invoiceCountThisMonth: 5,
        counterResetAt: lastMonth,
      },
    });

    const response = await generateInvoice(app, accessToken);
    expect(response.statusCode).toBe(201);
  });
});

describe('Invoice listing and filtering', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
  });

  it('should return empty list when no invoices', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/invoices',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('should list invoices with pagination', async () => {
    await generateInvoice(app, accessToken);
    await generateInvoice(app, accessToken);
    await generateInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: '/api/invoices?page=1&limit=2',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should filter by status', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoiceId}/send`,
      headers: authHeader(accessToken),
    });

    await generateInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: '/api/invoices?status=draft',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].status).toBe('draft');
  });

  it('should not return other users invoices', async () => {
    await generateInvoice(app, accessToken);

    const auth2 = await registerUser(app, 'other-inv@example.com');

    const response = await app.inject({
      method: 'GET',
      url: '/api/invoices',
      headers: authHeader(auth2.token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBe(0);
  });
});

describe('Get, update, delete, send invoice', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
  });

  it('should return a single invoice with items', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(invoiceId);
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.client).toBeDefined();
  });

  it('should return 404 for non-existent invoice', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${fakeId}`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(404);
  });

  it('should not return another users invoice', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    const auth2 = await registerUser(app, 'other-inv2@example.com');

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(auth2.token),
    });

    expect(response.statusCode).toBe(404);
  });

  it('should update a draft invoice with recalculated math', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(accessToken),
      payload: {
        notes: 'Updated notes',
        items: [
          {
            description: 'Consulting',
            quantity: 5,
            unitPrice: 20000,
          },
        ],
        taxRate: 1000,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.notes).toBe('Updated notes');
    expect(body.items.length).toBe(1);
    expect(body.items[0].description).toBe('Consulting');
    expect(body.subtotal).toBe(100000);
    expect(body.taxAmount).toBe(10000);
    expect(body.total).toBe(110000);
  });

  it('should reject updating a sent invoice', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoiceId}/send`,
      headers: authHeader(accessToken),
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(accessToken),
      payload: { notes: 'Cannot update' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should delete a draft invoice', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toBe('Invoice deleted');

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(accessToken),
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('should forbid deleting a sent invoice', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoiceId}/send`,
      headers: authHeader(accessToken),
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/invoices/${invoiceId}`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe('FORBIDDEN');
  });

  it('should mark a draft invoice as sent', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoiceId}/send`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('sent');
    expect(body.sentAt).toBeDefined();
  });

  it('should reject sending an already sent invoice', async () => {
    const genRes = await generateInvoice(app, accessToken);
    const invoiceId = genRes.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoiceId}/send`,
      headers: authHeader(accessToken),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoiceId}/send`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(403);
  });
});
