/**
 * Webhook Resource ID Extraction Tests
 *
 * Audit Issue #7: Fallback logic data.id || data.payment_session_id || data.refund_id
 * can cause idempotency collisions when different event types have the same id field.
 *
 * For example: a payment.created event with data.id="ps_123" and a refund.created
 * event with data.id="ps_123" (from payment_session_id) could collide.
 *
 * Fix: Use event-type-to-resource-ID map to extract the correct resource ID
 * based on the event type.
 */

import { PrismaClient } from '@prisma/client';
import { WebhookDeliveryService } from '../../src/services/webhook-delivery.service';

const prisma = new PrismaClient();

describe('Webhook resource ID extraction', () => {
  let service: WebhookDeliveryService;
  let userId: string;

  beforeAll(async () => {
    service = new WebhookDeliveryService(prisma);

    // Create test user and webhook endpoint
    const user = await prisma.user.create({
      data: {
        email: `webhook-resource-id-${Date.now()}@test.com`,
        passwordHash: 'hashed-password',
      },
    });
    userId = user.id;

    await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        events: [
          'payment.created', 'payment.completed',
          'refund.created', 'refund.completed', 'refund.failed',
        ],
        enabled: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.webhookDelivery.deleteMany({
      where: { endpoint: { userId } },
    });
    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('should extract payment session ID for payment events', async () => {
    const paymentData = {
      id: 'ps_abc123',
      amount: 100,
      currency: 'USD',
      status: 'PENDING',
    };

    const count = await service.queueWebhook(userId, 'payment.created', paymentData);
    expect(count).toBe(1);

    // Verify the resource ID used was ps_abc123
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { resourceId: 'ps_abc123' },
    });
    expect(deliveries.length).toBe(1);
  });

  it('should extract refund ID (not payment_session_id) for refund events', async () => {
    const refundData = {
      id: 'ref_xyz789',
      payment_session_id: 'ps_abc123',
      refund_id: 'ref_xyz789',
      amount: 50,
      status: 'PENDING',
    };

    const count = await service.queueWebhook(userId, 'refund.created', refundData);
    expect(count).toBe(1);

    // Verify the resource ID used was ref_xyz789 (refund ID), not ps_abc123
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { resourceId: 'ref_xyz789', eventType: 'refund.created' },
    });
    expect(deliveries.length).toBe(1);
  });

  it('should NOT collide when payment and refund share the same data.id', async () => {
    // This scenario is the core of the vulnerability
    const sharedId = 'shared_id_' + Date.now();

    // Queue payment event
    await service.queueWebhook(userId, 'payment.completed', {
      id: sharedId,
      amount: 100,
      currency: 'USD',
      status: 'COMPLETED',
    });

    // Queue refund event with same id field but different refund_id
    await service.queueWebhook(userId, 'refund.completed', {
      id: sharedId,
      payment_session_id: sharedId,
      refund_id: 'ref_different_' + Date.now(),
      amount: 50,
      status: 'COMPLETED',
    });

    // Both should exist — no idempotency collision
    const paymentDeliveries = await prisma.webhookDelivery.findMany({
      where: { eventType: 'payment.completed', resourceId: sharedId },
    });
    const refundDeliveries = await prisma.webhookDelivery.findMany({
      where: { eventType: 'refund.completed' },
      orderBy: { id: 'desc' },
      take: 1,
    });

    expect(paymentDeliveries.length).toBe(1);
    expect(refundDeliveries.length).toBe(1);
    // The refund delivery should use the refund_id, not the shared id
    expect(refundDeliveries[0].resourceId).not.toBe(sharedId);
  });
});
