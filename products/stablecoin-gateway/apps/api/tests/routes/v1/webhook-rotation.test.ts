import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../setup';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { signWebhookPayload, verifyWebhookSignature } from '../../../src/utils/crypto';

describe('POST /v1/webhooks/:id/rotate-secret', () => {
  let app: FastifyInstance;
  let userId: string;
  let authToken: string;
  let otherUserId: string;
  let otherAuthToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create primary test user
    const passwordHash = await bcrypt.hash('TestPass123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'webhook-rotation-test@example.com',
        passwordHash,
      },
    });
    userId = user.id;
    authToken = app.jwt.sign({ userId: user.id });

    // Create second test user for ownership tests
    const otherUser = await prisma.user.create({
      data: {
        email: 'webhook-rotation-other@example.com',
        passwordHash,
      },
    });
    otherUserId = otherUser.id;
    otherAuthToken = app.jwt.sign({ userId: otherUser.id });
  });

  afterAll(async () => {
    await prisma.webhookEndpoint.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.webhookEndpoint.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
  });

  it('should rotate secret and return new secret', async () => {
    // Create a webhook first
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_oldsecrethex1234567890abcdef1234567890abcdef1234567890abcdef1234',
        events: ['payment.created'],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      id: webhook.id,
      secret: expect.any(String),
      rotatedAt: expect.any(String),
    });
    // New secret should have whsec_ prefix
    expect(body.secret).toMatch(/^whsec_[a-f0-9]{64}$/);
    // rotatedAt should be a valid ISO date
    expect(new Date(body.rotatedAt).toISOString()).toBe(body.rotatedAt);
  });

  it('should invalidate old secret after rotation', async () => {
    const oldSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: oldSecret,
        events: ['payment.created'],
      },
    });

    // Rotate the secret
    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    const newSecret = body.secret;

    // Verify new secret is different from old
    expect(newSecret).not.toBe(oldSecret);

    // Verify old secret is no longer stored in DB
    const updatedWebhook = await prisma.webhookEndpoint.findUnique({
      where: { id: webhook.id },
    });
    expect(updatedWebhook?.secret).not.toBe(oldSecret);
  });

  it('should produce valid HMAC signatures with new secret', async () => {
    const oldSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: oldSecret,
        events: ['payment.created'],
      },
    });

    // Rotate the secret
    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const newSecret = response.json().secret;

    // Verify HMAC with new secret works
    const payload = JSON.stringify({ event: 'payment.created', data: {} });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(payload, newSecret, timestamp);
    expect(verifyWebhookSignature(payload, signature, newSecret, timestamp)).toBe(true);

    // Verify HMAC with old secret no longer matches
    const oldSignature = signWebhookPayload(payload, oldSecret, timestamp);
    expect(verifyWebhookSignature(payload, oldSignature, newSecret, timestamp)).toBe(false);
  });

  it('should return 404 for non-existent webhook ID', async () => {
    const fakeId = crypto.randomUUID();

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${fakeId}/rotate-secret`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.type).toContain('webhook-not-found');
  });

  it('should return 404 when non-owner tries to rotate', async () => {
    // Create webhook owned by primary user
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_' + crypto.randomBytes(32).toString('hex'),
        events: ['payment.created'],
      },
    });

    // Try to rotate using other user's token
    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: {
        authorization: `Bearer ${otherAuthToken}`,
      },
    });

    // Should return 404 (not 403) to prevent webhook enumeration
    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.type).toContain('webhook-not-found');

    // Verify original secret was not changed
    const unchanged = await prisma.webhookEndpoint.findUnique({
      where: { id: webhook.id },
    });
    expect(unchanged?.secret).toMatch(/^whsec_/);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_' + crypto.randomBytes(32).toString('hex'),
        events: ['payment.created'],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should update the updatedAt timestamp on rotation', async () => {
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_' + crypto.randomBytes(32).toString('hex'),
        events: ['payment.created'],
      },
    });

    const beforeRotation = webhook.updatedAt;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 50));

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);

    const updatedWebhook = await prisma.webhookEndpoint.findUnique({
      where: { id: webhook.id },
    });
    expect(updatedWebhook!.updatedAt.getTime()).toBeGreaterThan(
      beforeRotation.getTime()
    );
  });

  it('should log the rotation event', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'whsec_' + crypto.randomBytes(32).toString('hex'),
        events: ['payment.created'],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/${webhook.id}/rotate-secret`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);

    // Verify rotation was logged
    const logCalls = consoleSpy.mock.calls.map(call =>
      typeof call[0] === 'string' ? call[0] : JSON.stringify(call[0])
    );
    const rotationLog = logCalls.find(log =>
      log.includes('Webhook secret rotated')
    );
    expect(rotationLog).toBeDefined();

    consoleSpy.mockRestore();
  });
});
