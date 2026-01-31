/**
 * Webhook Delivery Service
 *
 * Handles queuing and delivery of webhook events to merchant endpoints with:
 * - HMAC-SHA256 signature verification
 * - Exponential backoff retry logic
 * - Delivery attempt tracking
 * - Concurrent delivery processing
 * - Circuit breaker per endpoint (Redis-backed)
 *
 * Circuit Breaker:
 * Tracks consecutive failures per endpoint in Redis. After 10 consecutive
 * failures the circuit opens, pausing deliveries to that endpoint for 5
 * minutes. After the cooldown the circuit resets and allows a probe
 * delivery. A successful delivery resets the failure counter immediately.
 * When Redis is unavailable the circuit breaker is disabled and all
 * deliveries are attempted normally.
 *
 * Event Types:
 * - payment.created - New payment session initiated
 * - payment.confirming - Payment transaction detected, awaiting confirmations
 * - payment.completed - Payment successfully verified and confirmed
 * - payment.failed - Payment verification failed or transaction reverted
 * - payment.refunded - Payment fully refunded to customer
 * - refund.created - Refund initiated by merchant
 * - refund.processing - Refund transaction submitted, awaiting confirmation
 * - refund.completed - Refund successfully processed on-chain
 * - refund.failed - Refund processing failed
 */

import { PrismaClient, WebhookStatus } from '@prisma/client';
import { signWebhookPayload } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { validateWebhookUrl } from '../utils/url-validator.js';
import { decryptSecret } from '../utils/encryption.js';

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
 * Minimal Redis interface required by the circuit breaker.
 * Matches the subset of ioredis methods we actually call so
 * that unit tests can supply a lightweight mock.
 */
interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<string>;
  incr(key: string): Promise<number>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any>;
}

export class WebhookDeliveryService {
  private prisma: PrismaClient;
  private redis: RedisLike | null;
  private maxRetries = 5;
  private retryDelays = [60, 300, 900, 3600, 7200]; // 1min, 5min, 15min, 1hr, 2hr in seconds

  // Circuit breaker configuration
  private readonly CIRCUIT_THRESHOLD = 10;
  private readonly CIRCUIT_RESET_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Lua script that atomically increments the failure counter,
   * refreshes its TTL, and opens the circuit when the threshold
   * is reached. Executed via Redis EVAL so the entire sequence
   * runs without interleaving from other clients.
   *
   * KEYS[1] = circuit:failures:<endpointId>
   * KEYS[2] = circuit:open:<endpointId>
   * ARGV[1] = expire seconds for the failure counter (600)
   * ARGV[2] = circuit threshold (10)
   * ARGV[3] = current timestamp string
   * ARGV[4] = circuit reset milliseconds (PX value)
   */
  private static readonly CIRCUIT_BREAKER_SCRIPT = `
    local failures = redis.call('INCR', KEYS[1])
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    if failures >= tonumber(ARGV[2]) then
      redis.call('SET', KEYS[2], ARGV[3], 'PX', ARGV[4])
    end
    return failures
  `;

  constructor(prisma: PrismaClient, redis?: RedisLike | null) {
    this.prisma = prisma;
    this.redis = redis ?? null;
  }

  // ---------------------------------------------------------------------------
  // Circuit breaker helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether the circuit for a given endpoint is open.
   *
   * Returns true when the endpoint has hit the failure threshold
   * and the cooldown period has not yet elapsed. If the cooldown
   * has passed the circuit state is cleared (half-open -> closed).
   *
   * When Redis is unavailable the circuit breaker is disabled and
   * this always returns false so that deliveries proceed normally.
   */
  private async isCircuitOpen(endpointId: string): Promise<boolean> {
    if (!this.redis) return false;

    const openedAt = await this.redis.get('circuit:open:' + endpointId);
    if (!openedAt) return false;

    if (Date.now() - parseInt(openedAt, 10) < this.CIRCUIT_RESET_MS) {
      return true; // Circuit still open -- cooldown has not elapsed
    }

    // Cooldown elapsed -- reset the circuit (half-open -> closed)
    await this.redis.del('circuit:open:' + endpointId);
    await this.redis.del('circuit:failures:' + endpointId);
    return false;
  }

  /**
   * Record a delivery failure for the circuit breaker.
   *
   * Uses a Lua script executed via Redis EVAL to atomically:
   * 1. Increment the consecutive-failure counter
   * 2. Refresh its TTL
   * 3. Open the circuit if the threshold is reached
   *
   * Falls back to the non-atomic incr+check+set approach if EVAL
   * is not supported (e.g., certain Redis-compatible stores).
   */
  private async recordFailure(endpointId: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.eval(
        WebhookDeliveryService.CIRCUIT_BREAKER_SCRIPT,
        2,
        'circuit:failures:' + endpointId,
        'circuit:open:' + endpointId,
        600,
        this.CIRCUIT_THRESHOLD,
        String(Date.now()),
        this.CIRCUIT_RESET_MS,
      );
    } catch (error) {
      // Fallback: if eval not supported, use original non-atomic approach
      const failures = await this.redis.incr('circuit:failures:' + endpointId);
      await this.redis.expire('circuit:failures:' + endpointId, 600);
      if (failures >= this.CIRCUIT_THRESHOLD) {
        await this.redis.set(
          'circuit:open:' + endpointId,
          String(Date.now()),
          'PX',
          this.CIRCUIT_RESET_MS,
        );
      }
    }
  }

  /**
   * Record a successful delivery, resetting the circuit breaker
   * state for the endpoint.
   */
  private async recordSuccess(endpointId: string): Promise<void> {
    if (!this.redis) return;

    await this.redis.del('circuit:failures:' + endpointId);
    await this.redis.del('circuit:open:' + endpointId);
  }

  /**
   * Queue webhook for delivery to all subscribed endpoints
   *
   * Finds all active webhook endpoints subscribed to the event type
   * and creates delivery records in PENDING status.
   *
   * IDEMPOTENCY: Prevents duplicate deliveries for the same event on the same resource.
   * Uses composite key (endpointId, eventType, resourceId) to ensure uniqueness.
   */
  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    data: Record<string, any>
  ): Promise<number> {
    // Extract resource ID based on event type to prevent idempotency
    // collisions across different resource types (audit #7).
    // Refund events use refund_id; payment events use payment session id.
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

    // Find all active webhooks for this user subscribed to this event
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        userId,
        enabled: true,
        events: {
          has: eventType,
        },
      },
    });

    if (endpoints.length === 0) {
      logger.debug('No webhook endpoints subscribed to event', {
        userId,
        eventType,
      });
      return 0;
    }

    // Create payload
    const payload: WebhookPayload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: eventType,
      created_at: new Date().toISOString(),
      data,
    };

    // Queue delivery for each endpoint (with idempotency check)
    let createdCount = 0;
    const deliveryIds: string[] = [];

    for (const endpoint of endpoints) {
      try {
        // Try to create delivery (will fail if duplicate exists due to unique constraint)
        const delivery = await this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            eventType,
            resourceId,
            payload: payload as any,
            status: WebhookStatus.PENDING,
            attempts: 0,
            nextAttemptAt: new Date(), // Deliver immediately
          },
        });

        createdCount++;
        deliveryIds.push(delivery.id);
      } catch (error: any) {
        // Check if error is due to unique constraint violation (idempotency)
        // Prisma P2002 error has meta.target as array of field names
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
          // Skip this delivery - it already exists
          continue;
        }

        // Re-throw other errors
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
   * Process all pending and retry-ready webhook deliveries
   *
   * Fetches deliveries that are:
   * - PENDING status
   * - FAILED status with nextAttemptAt in the past (retries)
   *
   * Uses SELECT FOR UPDATE SKIP LOCKED to prevent race conditions
   * when multiple workers are processing the queue concurrently.
   *
   * Processes them concurrently with a limit
   */
  async processQueue(concurrencyLimit = 10): Promise<void> {
    const now = new Date();

    // Use SELECT FOR UPDATE SKIP LOCKED to prevent race conditions
    // Multiple workers can process the queue concurrently without conflicts
    // SKIP LOCKED ensures workers don't wait for locked rows
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

    logger.info('Processing webhook queue', {
      count: deliveries.length,
    });

    // Transform raw query results to match expected format
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

    // Process deliveries concurrently
    await Promise.allSettled(
      transformedDeliveries.map((delivery) => this.deliverWebhook(delivery))
    );
  }

  /**
   * Deliver a single webhook to its endpoint
   *
   * Steps:
   * 1. Check circuit breaker -- skip if open
   * 2. Update status to DELIVERING
   * 3. Sign payload with HMAC-SHA256
   * 4. Send HTTP POST request
   * 5. Update delivery record based on response
   * 6. Record success/failure for circuit breaker
   * 7. Schedule retry if failed and under max retries
   */
  private async deliverWebhook(delivery: any): Promise<void> {
    const { id, endpoint, payload, attempts } = delivery;

    // Circuit breaker check -- skip delivery if circuit is open
    const circuitOpen = await this.isCircuitOpen(endpoint.id);
    if (circuitOpen) {
      logger.warn('Circuit breaker open - skipping webhook delivery', {
        deliveryId: id,
        endpointId: endpoint.id,
        url: endpoint.url,
      });
      // Leave the delivery in PENDING so it will be retried after cooldown
      return;
    }

    try {
      // Mark as delivering
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: WebhookStatus.DELIVERING,
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Validate URL before delivery (defense in depth - should already be validated on creation)
      // Includes DNS resolution to prevent DNS rebinding attacks
      try {
        await validateWebhookUrl(endpoint.url);
      } catch (error) {
        // URL validation failed - mark delivery as permanently failed
        await this.prisma.webhookDelivery.update({
          where: { id },
          data: {
            status: WebhookStatus.FAILED,
            errorMessage: `Invalid webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            nextAttemptAt: null, // Don't retry invalid URLs
          },
        });
        logger.error('Webhook delivery blocked - invalid URL', {
          deliveryId: id,
          endpointId: endpoint.id,
          url: endpoint.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await this.recordFailure(endpoint.id);
        return;
      }

      // Decrypt secret if encrypted (otherwise use as-is for backwards compatibility)
      const secret = process.env.WEBHOOK_ENCRYPTION_KEY
        ? decryptSecret(endpoint.secret)
        : endpoint.secret;

      // Generate signature
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadString = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadString, secret, timestamp);

      // Send webhook
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-ID': delivery.id,
          'User-Agent': 'StablecoinGateway-Webhooks/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      const responseBody = await response.text().catch(() => '');

      // Check if delivery succeeded (2xx status codes)
      if (response.status >= 200 && response.status < 300) {
        await this.prisma.webhookDelivery.update({
          where: { id },
          data: {
            status: WebhookStatus.SUCCEEDED,
            succeededAt: new Date(),
            responseCode: response.status,
            responseBody: responseBody.substring(0, 10000), // Limit to 10KB
          },
        });

        logger.info('Webhook delivered successfully', {
          deliveryId: id,
          endpointId: endpoint.id,
          eventType: delivery.eventType,
          attempts: attempts + 1,
          statusCode: response.status,
        });

        await this.recordSuccess(endpoint.id);
      } else {
        // Delivery failed - determine if we should retry
        await this.handleDeliveryFailure(
          id,
          attempts + 1,
          response.status,
          responseBody,
          `HTTP ${response.status}: ${response.statusText}`
        );

        await this.recordFailure(endpoint.id);
      }
    } catch (error) {
      // Network error, timeout, or other exception
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.handleDeliveryFailure(id, attempts + 1, null, null, errorMessage);

      logger.error('Webhook delivery failed', {
        deliveryId: id,
        endpointId: endpoint.id,
        eventType: delivery.eventType,
        attempts: attempts + 1,
        error: errorMessage,
      });

      await this.recordFailure(endpoint.id);
    }
  }

  /**
   * Handle failed delivery - update status and schedule retry if under limit
   */
  private async handleDeliveryFailure(
    deliveryId: string,
    attempts: number,
    responseCode: number | null,
    responseBody: string | null,
    errorMessage: string
  ): Promise<void> {
    // Check if we should retry
    if (attempts < this.maxRetries) {
      // Schedule retry with exponential backoff
      const delaySeconds = this.retryDelays[attempts - 1] || 7200; // Default to 2hr if beyond array
      const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookStatus.FAILED,
          responseCode,
          responseBody: responseBody?.substring(0, 10000),
          errorMessage: errorMessage.substring(0, 1000),
          nextAttemptAt,
        },
      });

      logger.warn('Webhook delivery failed, will retry', {
        deliveryId,
        attempts,
        nextAttemptAt,
        errorMessage,
      });
    } else {
      // Max retries exceeded - mark as permanently failed
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookStatus.FAILED,
          responseCode,
          responseBody: responseBody?.substring(0, 10000),
          errorMessage: `Max retries (${this.maxRetries}) exceeded: ${errorMessage}`.substring(
            0,
            1000
          ),
          nextAttemptAt: null, // No more retries
        },
      });

      logger.error('Webhook delivery permanently failed', {
        deliveryId,
        attempts,
        errorMessage,
      });
    }
  }

  /**
   * Get delivery status for a specific webhook delivery
   */
  async getDeliveryStatus(deliveryId: string): Promise<any> {
    return this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        endpoint: {
          select: {
            id: true,
            url: true,
            events: true,
          },
        },
      },
    });
  }

  /**
   * Get all deliveries for a webhook endpoint (for debugging/monitoring)
   */
  async getEndpointDeliveries(
    endpointId: string,
    limit = 100
  ): Promise<any[]> {
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { id: 'desc' },
      take: limit,
    });
  }
}
