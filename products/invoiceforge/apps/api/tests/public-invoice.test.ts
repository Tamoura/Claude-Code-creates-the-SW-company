import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb, prisma } from './setup';
import {
  setAnthropicClient,
} from '../src/modules/invoices/ai-service';

let app: FastifyInstance;

const validUser = {
  email: 'publictest@example.com',
  password: 'SecurePass123!',
  name: 'Public Test User',
};

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

function createFakeAnthropicClient() {
  return {
    messages: {
      create: async () => ({
        content: [
          {
            type: 'tool_use',
            name: 'create_invoice',
            input: {
              clientName: 'Public Client Co',
              clientEmail: 'client@public.com',
              items: [
                {
                  description: 'Consulting',
                  quantity: 5,
                  unitPrice: 20000,
                  unitType: 'hours',
                },
              ],
              taxRate: 1000,
              dueDate: null,
              notes: 'Payment due upon receipt',
            },
          },
        ],
      }),
    },
  } as unknown;
}

async function registerUser(application: FastifyInstance) {
  const res = await application.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: validUser,
  });
  const body = res.json();
  return { token: body.accessToken, userId: body.user.id };
}

async function createAndSendInvoice(
  application: FastifyInstance,
  token: string
) {
  const genRes = await application.inject({
    method: 'POST',
    url: '/api/invoices/generate',
    headers: authHeader(token),
    payload: {
      prompt: 'Invoice Public Client Co for 5 hours consulting at $200/hr plus 10% tax',
    },
  });
  const invoice = genRes.json();

  // Send the invoice to get a shareToken
  await application.inject({
    method: 'POST',
    url: `/api/invoices/${invoice.id}/send`,
    headers: authHeader(token),
  });

  // Refetch to get updated data
  const getRes = await application.inject({
    method: 'GET',
    url: `/api/invoices/${invoice.id}`,
    headers: authHeader(token),
  });

  return getRes.json();
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

describe('GET /api/invoices/public/:token', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
  });

  it('should return a public invoice by share token', async () => {
    const invoice = await createAndSendInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/public/${invoice.shareToken}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.invoiceNumber).toBe(invoice.invoiceNumber);
    expect(body.status).toBe('sent');
    expect(body.fromName).toBeDefined();
    expect(body.client).toBeDefined();
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.subtotal).toBe(invoice.subtotal);
    expect(body.total).toBe(invoice.total);
    expect(body.currency).toBe('USD');
  });

  it('should not expose sensitive user data', async () => {
    const invoice = await createAndSendInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/public/${invoice.shareToken}`,
    });

    const body = response.json();
    // Must not leak user internals
    expect(body.userId).toBeUndefined();
    expect(body.user).toBeUndefined();
    expect(body.aiPrompt).toBeUndefined();
  });

  it('should return 404 for invalid share token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/invoices/public/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should not require authentication', async () => {
    const invoice = await createAndSendInvoice(app, accessToken);

    // No auth header at all
    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/public/${invoice.shareToken}`,
    });

    expect(response.statusCode).toBe(200);
  });

  it('should include payment link if set', async () => {
    const invoice = await createAndSendInvoice(app, accessToken);

    // Manually set a payment link
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentLink: 'https://checkout.stripe.com/test' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/public/${invoice.shareToken}`,
    });

    const body = response.json();
    expect(body.paymentLink).toBe('https://checkout.stripe.com/test');
  });
});
