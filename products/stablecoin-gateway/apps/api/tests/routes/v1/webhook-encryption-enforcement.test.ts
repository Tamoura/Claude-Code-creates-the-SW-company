import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../setup';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { initializeEncryption } from '../../../src/utils/encryption';

/**
 * Webhook Encryption Enforcement Tests
 *
 * Validates that webhook secrets are always encrypted in production.
 * In non-production environments, plaintext fallback is permitted.
 */
describe('Webhook encryption enforcement', () => {
  let app: FastifyInstance;
  let userId: string;
  let authToken: string;

  const savedNodeEnv = process.env.NODE_ENV;
  const savedEncryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY;

  beforeAll(async () => {
    app = await buildApp();

    const passwordHash = await bcrypt.hash('TestPass123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'webhook-encrypt-enforce@example.com',
        passwordHash,
      },
    });
    userId = user.id;
    authToken = app.jwt.sign({ userId: user.id });
  });

  afterAll(async () => {
    process.env.NODE_ENV = savedNodeEnv;
    if (savedEncryptionKey !== undefined) {
      process.env.WEBHOOK_ENCRYPTION_KEY = savedEncryptionKey;
    } else {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;
    }

    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  afterEach(async () => {
    // Restore env after each test
    process.env.NODE_ENV = savedNodeEnv;
    if (savedEncryptionKey !== undefined) {
      process.env.WEBHOOK_ENCRYPTION_KEY = savedEncryptionKey;
    } else {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;
    }

    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
  });

  // ---- CREATE (POST /v1/webhooks) ----

  it('should return 500 when creating webhook in production without encryption key', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_ENCRYPTION_KEY;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        url: 'https://example.com/webhook',
        events: ['payment.created'],
      },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.type).toContain('encryption-required');
    expect(body.detail).toMatch(/encryption key.*required.*production/i);
  });

  it('should create webhook in production when encryption key is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);
    initializeEncryption();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        url: 'https://example.com/webhook',
        events: ['payment.created'],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.secret).toMatch(/^whsec_/);
  });

  it('should create webhook in development without encryption key (plaintext allowed)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.WEBHOOK_ENCRYPTION_KEY;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        url: 'https://example.com/webhook',
        events: ['payment.created'],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.secret).toMatch(/^whsec_/);

    // Verify plaintext storage (no colon-delimited encryption format)
    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(webhook?.secret).toMatch(/^whsec_/);
    expect(webhook?.secret).not.toContain(':');
  });

  it('should encrypt webhook secret in development when encryption key is set', async () => {
    process.env.NODE_ENV = 'development';
    process.env.WEBHOOK_ENCRYPTION_KEY = 'fedcba9876543210'.repeat(4);
    initializeEncryption();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        url: 'https://example.com/webhook',
        events: ['payment.created'],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.secret).toMatch(/^whsec_/);

    // Verify encrypted storage (colon-delimited iv:authTag:ciphertext)
    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(webhook?.secret).toContain(':');
  });

  // ---- ROTATE-SECRET (POST /v1/webhooks/:id/rotate-secret) ----

  it('should return 500 when rotating secret in production without encryption key', async () => {
    // Create webhook in test/dev mode first
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_' + crypto.randomBytes(32).toString('hex'),
        events: ['payment.created'],
      },
    });

    // Switch to production without encryption key
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_ENCRYPTION_KEY;

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.type).toContain('encryption-required');
    expect(body.detail).toMatch(/encryption key.*required.*production/i);
  });

  it('should rotate secret in production when encryption key is set', async () => {
    // Create webhook in test/dev mode first
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_' + crypto.randomBytes(32).toString('hex'),
        events: ['payment.created'],
      },
    });

    // Switch to production with encryption key
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_ENCRYPTION_KEY = 'abcdef0123456789'.repeat(4);
    initializeEncryption();

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.secret).toMatch(/^whsec_/);
  });
});
