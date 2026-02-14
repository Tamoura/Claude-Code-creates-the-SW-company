/**
 * Webhook Delivery Service (Facade)
 *
 * Handles queuing and processing of webhook deliveries.
 * Delegates actual delivery to WebhookDeliveryExecutorService
 * and circuit breaking to WebhookCircuitBreakerService.
 */

import { logger } from '@connectsw/shared';
import { WebhookCircuitBreakerService, type RedisLike } from './circuit-breaker.service.js';
import { WebhookDeliveryExecutorService, type WebhookDeliveryExecutorOptions } from './delivery-executor.service.js';

/** Minimal Prisma client interface for webhook delivery */
interface PrismaWebhookClient {
  webhookEndpoint: {
    findMany(args: Record<string, unknown>): Promise<Array<{ id: string; url: string; secret: string; userId: string; events: string[]; enabled: boolean }>>;
  };
  webhookDelivery: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  };
  $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]>;
}

export interface WebhookDeliveryServiceOptions extends WebhookDeliveryExecutorOptions {
  /** Circuit breaker options */
  circuitBreaker?: {
    threshold?: number;
    resetMs?: number;
  };
}

export class WebhookDeliveryService {
  private prisma: PrismaWebhookClient;
  private executor: WebhookDeliveryExecutorService;
  private maxRetries: number;

  constructor(prisma: PrismaWebhookClient, redis?: RedisLike | null, opts?: WebhookDeliveryServiceOptions) {
    this.prisma = prisma;
    this.maxRetries = opts?.maxRetries ?? 5;
    const cb = new WebhookCircuitBreakerService(redis ?? null, opts?.circuitBreaker);
    this.executor = new WebhookDeliveryExecutorService(prisma, cb, opts);
  }

  /**
   * Queue webhook for delivery to all subscribed endpoints.
   * Uses composite unique key for idempotency.
   */
  async queueWebhook(
    userId: string,
    eventType: string,
    data: Record<string, unknown>,
    resourceId?: string,
  ): Promise<number> {
    const resolvedResourceId = resourceId || data.id || data.resource_id;
    if (!resolvedResourceId) {
      throw new Error('Webhook data must contain a resource identifier (id or resource_id), or pass resourceId explicitly');
    }

    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { userId, enabled: true, events: { has: eventType } },
    });

    if (endpoints.length === 0) {
      logger.debug('No endpoints subscribed', { userId, eventType });
      return 0;
    }

    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: eventType,
      created_at: new Date().toISOString(),
      data,
    };

    let created = 0;

    for (const endpoint of endpoints) {
      try {
        await this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            eventType,
            resourceId: resolvedResourceId,
            payload: payload as Record<string, unknown>,
            status: 'PENDING',
            attempts: 0,
            nextAttemptAt: new Date(),
          },
        });
        created++;
      } catch (error: unknown) {
        // Idempotency: skip duplicates (P2002 = unique constraint violation)
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
          logger.debug('Webhook delivery already exists (idempotent)', { eventType, resourceId: resolvedResourceId, endpointId: endpoint.id });
          continue;
        }
        throw error;
      }
    }

    if (created > 0) {
      logger.info('Webhooks queued', { userId, eventType, resourceId: resolvedResourceId, created });
    }
    return created;
  }

  /**
   * Process pending + retry-ready deliveries.
   * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent worker safety.
   */
  async processQueue(concurrencyLimit = 10): Promise<void> {
    const now = new Date();

    const deliveries: Record<string, unknown>[] = await this.prisma.$queryRaw`
      SELECT
        wd.id,
        wd.endpoint_id as "endpointId",
        wd.event_type as "eventType",
        wd.resource_id as "resourceId",
        wd.payload,
        wd.attempts,
        wd.status,
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

    if (deliveries.length === 0) return;

    logger.info('Processing webhook queue', { count: deliveries.length });

    const transformed = deliveries.map((d) => ({
      id: d.id,
      endpointId: d.endpointId,
      eventType: d.eventType,
      resourceId: d.resourceId,
      payload: d.payload,
      attempts: d.attempts,
      status: d.status,
      endpoint: {
        id: d['endpoint.id'],
        url: d['endpoint.url'],
        secret: d['endpoint.secret'],
        userId: d['endpoint.userId'],
      },
    }));

    await Promise.allSettled(transformed.map((d) => this.executor.deliverWebhook(d)));
  }

  async getDeliveryStatus(deliveryId: string) {
    return this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: { select: { id: true, url: true, events: true } } },
    });
  }

  async getEndpointDeliveries(endpointId: string, limit = 100) {
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { id: 'desc' },
      take: limit,
    });
  }
}
