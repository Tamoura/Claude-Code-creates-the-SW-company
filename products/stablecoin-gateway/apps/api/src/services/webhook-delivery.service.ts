/**
 * Webhook Delivery Service (Facade)
 *
 * Delegates to WebhookCircuitBreakerService and WebhookDeliveryExecutorService.
 * Handles webhook queuing and queue processing.
 *
 * All public API methods remain identical to preserve consumer imports.
 */

import crypto from 'crypto';
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

/**
 * ADR: Webhook Delivery Reliability Architecture
 *
 * The circuit breaker uses Redis Lua scripts for atomic check-and-
 * increment. A non-atomic approach (GET then INCR then conditional SET)
 * has a race window: two concurrent failures could both read
 * failures=9, both INCR to 10, but only one SET the circuit-open key.
 * The Lua script executes INCR, EXPIRE, and conditional SET as a single
 * atomic Redis operation, guaranteeing the circuit opens at exactly the
 * threshold regardless of concurrency. A non-atomic fallback is
 * provided for Redis versions that do not support EVAL.
 *
 * HMAC-SHA256 signatures are sent with every webhook delivery so that
 * merchants can verify authenticity and integrity. Without signatures,
 * an attacker who discovers the merchant's webhook URL could forge
 * payment.completed events and trick the merchant into shipping goods
 * for unpaid orders. The signature uses the endpoint's shared secret
 * and includes a timestamp to prevent replay attacks.
 *
 * Delivery retries use exponential backoff (1m, 5m, 15m, 1h, 2h) with
 * jitter inherent in queue processing timing. Fixed-interval retries
 * would cause thundering-herd problems when a merchant endpoint
 * recovers from an outage -- all queued deliveries would retry
 * simultaneously, likely overwhelming the endpoint again. Exponential
 * backoff spreads retries over increasing windows, giving the endpoint
 * time to recover while still guaranteeing eventual delivery within a
 * bounded window.
 *
 * Alternatives considered:
 * - In-memory circuit breaker: Rejected because multiple API server
 *   instances would maintain independent counters, allowing each to
 *   send up to threshold failures before any trips.
 * - RSA signatures: Rejected because HMAC-SHA256 is faster, simpler,
 *   and sufficient for symmetric verification where both sides share
 *   a secret.
 * - Linear backoff: Rejected because it does not provide enough
 *   spacing at higher retry counts to prevent repeated overload.
 */
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
      id: `evt_${crypto.randomUUID()}`,
      type: eventType,
      created_at: new Date().toISOString(),
      data,
    };

    let createdCount = 0;
    const deliveryIds: string[] = [];

    for (const endpoint of endpoints) {
      try {
        // Create delivery record. The DB unique constraint
        // (endpoint_id, event_type, resource_id) prevents duplicates
        // atomically — a concurrent create will fail with P2002.
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

    // Claim deliveries inside a transaction so that FOR UPDATE SKIP LOCKED
    // row locks are effective. We mark claimed rows as IN_PROGRESS inside
    // the transaction, then process them outside to avoid holding the
    // transaction open during HTTP delivery (which can be slow).
    const claimedDeliveries = await this.prisma.$transaction(async (tx) => {
      const deliveries: any[] = await tx.$queryRaw`
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
        FOR UPDATE OF wd SKIP LOCKED
      `;

      if (deliveries.length === 0) {
        return [];
      }

      // Mark claimed rows so other workers skip them even after
      // this transaction commits.
      const claimedIds = deliveries.map((d) => d.id);
      await tx.$executeRaw`
        UPDATE webhook_deliveries
        SET status = 'DELIVERING'
        WHERE id = ANY(${claimedIds}::text[])
      `;

      return deliveries;
    });

    if (claimedDeliveries.length === 0) {
      return;
    }

    logger.info('Processing webhook queue', { count: claimedDeliveries.length });

    const transformedDeliveries = claimedDeliveries.map((d: any) => ({
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
