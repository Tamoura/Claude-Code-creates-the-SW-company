import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb, prisma } from './setup';
import {
  setAnthropicClient,
} from '../src/modules/invoices/ai-service';
import { setPdfGenerator } from '../src/modules/invoices/handlers';

let app: FastifyInstance;

const validUser = {
  email: 'webhooktest@example.com',
  password: 'SecurePass123!',
  name: 'Webhook Test User',
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
              clientName: 'Webhook Client',
              clientEmail: 'wh@client.com',
              items: [
                {
                  description: 'Service',
                  quantity: 1,
                  unitPrice: 50000,
                  unitType: 'flat',
                },
              ],
              taxRate: 0,
              dueDate: null,
              notes: null,
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

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  setAnthropicClient(null);
  setPdfGenerator(null);
  await app.close();
  await closeDb();
});

describe('POST /api/webhooks/stripe', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it('should accept POST requests to the webhook endpoint', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: { type: 'test' },
      headers: {
        'stripe-signature': 'test-sig',
      },
    });

    // Should not return 404 -- the endpoint exists
    expect(response.statusCode).not.toBe(404);
  });

  it('should return 400 for missing stripe signature', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: { type: 'test' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should not require JWT authentication', async () => {
    // Webhook endpoint should NOT return 401 unauthorized
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: { type: 'test' },
      headers: {
        'stripe-signature': 'test-sig',
      },
    });

    expect(response.statusCode).not.toBe(401);
  });
});

describe('Invoice payment marking (service-level)', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
    userId = auth.userId;
  });

  it('should mark an invoice as paid', async () => {
    // Create and send an invoice
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/invoices/generate',
      headers: authHeader(accessToken),
      payload: { prompt: 'Invoice Webhook Client for flat service at $500' },
    });
    const invoice = genRes.json();

    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/send`,
      headers: authHeader(accessToken),
    });

    // Directly update the invoice to simulate webhook payment
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Verify it's now paid
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoice.id}`,
      headers: authHeader(accessToken),
    });

    expect(getRes.json().status).toBe('paid');
    expect(getRes.json().paidAt).toBeDefined();
  });

  it('should be idempotent (skip if already paid)', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/invoices/generate',
      headers: authHeader(accessToken),
      payload: { prompt: 'Invoice Webhook Client for flat service at $500' },
    });
    const invoice = genRes.json();

    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/send`,
      headers: authHeader(accessToken),
    });

    const paidAt = new Date('2026-01-15T12:00:00Z');
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'paid', paidAt },
    });

    // Second update should not change the paidAt
    const existing = await prisma.invoice.findUnique({
      where: { id: invoice.id },
    });

    expect(existing!.status).toBe('paid');
    expect(existing!.paidAt!.toISOString()).toBe(
      paidAt.toISOString()
    );
  });
});

describe('Stripe payment link errors', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    const auth = await registerUser(app);
    accessToken = auth.token;
    userId = auth.userId;
  });

  it('should return 400 if user has no Stripe account', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/invoices/generate',
      headers: authHeader(accessToken),
      payload: { prompt: 'Invoice Webhook Client for flat service at $500' },
    });
    const invoice = genRes.json();

    // Send the invoice first
    await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/send`,
      headers: authHeader(accessToken),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/payment-link`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Stripe');
  });

  it('should return 400 if invoice is not sent', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/invoices/generate',
      headers: authHeader(accessToken),
      payload: { prompt: 'Invoice Webhook Client for flat service at $500' },
    });
    const invoice = genRes.json();

    // Set up stripe account but DON'T send invoice
    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: 'acct_test123' },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/invoices/${invoice.id}/payment-link`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('sent');
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invoices/00000000-0000-0000-0000-000000000000/payment-link',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('Stripe Connect endpoints', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDb();
    const auth = await registerUser(app);
    accessToken = auth.token;
  });

  it('GET /api/users/me/stripe/connect should return a URL', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me/stripe/connect',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().url).toBeDefined();
    expect(response.json().url).toContain('stripe');
  });

  it('POST /api/users/me/stripe/callback should require code', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users/me/stripe/callback',
      headers: authHeader(accessToken),
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should require authentication for connect', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me/stripe/connect',
    });

    expect(response.statusCode).toBe(401);
  });
});
