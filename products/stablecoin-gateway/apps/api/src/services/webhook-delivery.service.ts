/**
 * Webhook Delivery Service (Facade)
 *
 * Delegates to WebhookCircuitBreakerService and WebhookDeliveryExecutorService.
 * Handles webhook queuing and queue processing.
 *
 * All public API methods remain identical to preserve consumer imports.
 */

import { PrismaClient, WebhookStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { WebhookCircuitBreakerService, RedisLike } from './webhook-circuit-breaker.service.js';
import { WebhookDeliveryExecutorService } from './webhook-delivery-executor.service.js';

export type WebhookEventType =
  | 'payment.created'
  | 'payment.confirming'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'refund.created'
  | 'refund.processing'
  | 'refund.completed'
  | 'refund.failed';

interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: Record<string, any>;
}

export class WebhookDeliveryService {
  private prisma: PrismaClient;
  private executor: WebhookDeliveryExecutorService;
  private maxRetries = 5;

  constructor(prisma: PrismaClient, redis?: RedisLike | null) {
    this.prisma = prisma;
    const circuitBreaker = new WebhookCircuitBreakerService(redis ?? null);
    this.executor = new WebhookDeliveryExecutorService(prisma, circuitBreaker);
  }

  /**
   * Queue webhook for delivery to all subscribed endpoints.
   *
   * Uses composite key (endpointId, eventType, resourceId) for idempotency.
   */
  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    data: Record<string, any>
  ): Promise<number> {
    const resourceId = eventType.startsWith('refund.')
      ? (data.refund_id || data.id)
      : (data.id || data.payment_session_id);
    if (!resourceId) {
      logger.error('Cannot queue webhook - missing resource ID in data', {
        userId,
        eventType,
        data,
      });
      throw new Error('Webhook data must contain id, payment_session_id, or refund_id');
    }

    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        userId,
        enabled: true,
        events: { has: eventType },
      },
    });

    if (endpoints.length === 0) {
      logger.debug('No webhook endpoints subscribed to event', { userId, eventType });
      return 0;
    }

    const payload: WebhookPayload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: eventType,
      created_at: new Date().toISOString(),
      data,
    };

    let createdCount = 0;
    const deliveryIds: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const delivery = await this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            eventType,
            resourceId,
            payload: payload as any,
            status: WebhookStatus.PENDING,
            attempts: 0,
            nextAttemptAt: new Date(),
          },
        });

        createdCount++;
        deliveryIds.push(delivery.id);
      } catch (error: any) {
        if (
          error.code === 'P2002' &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes('endpoint_id') &&
          error.meta.target.includes('event_type') &&
          error.meta.target.includes('resource_id')
        ) {
          logger.debug('Webhook delivery already exists (idempotent)', {
            userId,
            eventType,
            resourceId,
            endpointId: endpoint.id,
          });
          continue;
        }
        throw error;
      }
    }

    if (createdCount > 0) {
      logger.info('Webhooks queued for delivery', {
        userId,
        eventType,
        resourceId,
        endpointCount: endpoints.length,
        createdCount,
        deliveryIds,
      });
    }

    return createdCount;
  }

  /**
   * Process all pending and retry-ready webhook deliveries.
   *
   * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent worker safety.
   */
  async processQueue(concurrencyLimit = 10): Promise<void> {
    const now = new Date();

    const deliveries: any[] = await this.prisma.$queryRaw`
      SELECT
        wd.id,
        wd.endpoint_id as "endpointId",
        wd.event_type as "eventType",
        wd.resource_id as "resourceId",
        wd.payload,
        wd.attempts,
        wd.status,
        wd.last_attempt_at as "lastAttemptAt",
        wd.next_attempt_at as "nextAttemptAt",
        we.id as "endpoint.id",
        we.url as "endpoint.url",
        we.secret as "endpoint.secret",
        we.user_id as "endpoint.userId"
      FROM webhook_deliveries wd
      INNER JOIN webhook_endpoints we ON wd.endpoint_id = we.id
      WHERE (
        wd.status = 'PENDING'
        OR (
          wd.status = 'FAILED'
          AND wd.next_attempt_at <= ${now}
          AND wd.attempts < ${this.maxRetries}
        )
      )
      ORDER BY wd.next_attempt_at ASC NULLS FIRST
      LIMIT ${concurrencyLimit}
      FOR UPDATE SKIP LOCKED
    `;

    if (deliveries.length === 0) {
      return;
    }

    logger.info('Processing webhook queue', { count: deliveries.length });

    const transformedDeliveries = deliveries.map((d) => ({
      id: d.id,
      endpointId: d.endpointId,
      eventType: d.eventType,
      resourceId: d.resourceId,
      payload: d.payload,
      attempts: d.attempts,
      status: d.status,
      lastAttemptAt: d.lastAttemptAt,
      nextAttemptAt: d.nextAttemptAt,
      endpoint: {
        id: d['endpoint.id'],
        url: d['endpoint.url'],
        secret: d['endpoint.secret'],
        userId: d['endpoint.userId'],
      },
    }));

    await Promise.allSettled(
      transformedDeliveries.map((delivery) => this.executor.deliverWebhook(delivery))
    );
  }

  // Delegate to executor
  async getDeliveryStatus(deliveryId: string): Promise<any> {
    return this.executor.getDeliveryStatus(deliveryId);
  }

  async getEndpointDeliveries(endpointId: string, limit = 100): Promise<any[]> {
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { id: 'desc' },
      take: limit,
    });
  }
}
