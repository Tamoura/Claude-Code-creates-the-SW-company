/**
 * Webhook Delivery Service
 *
 * Handles queuing and delivery of webhook events to merchant endpoints with:
 * - HMAC-SHA256 signature verification
 * - Exponential backoff retry logic
 * - Delivery attempt tracking
 * - Concurrent delivery processing
 *
 * Event Types:
 * - payment.created - New payment session initiated
 * - payment.completed - Payment successfully verified
 * - payment.failed - Payment verification failed
 * - refund.created - Refund initiated
 * - refund.completed - Refund processed
 */

import { PrismaClient, WebhookStatus } from '@prisma/client';
import { signWebhookPayload } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export type WebhookEventType =
  | 'payment.created'
  | 'payment.completed'
  | 'payment.failed'
  | 'refund.created'
  | 'refund.completed';

interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: Record<string, any>;
}

export class WebhookDeliveryService {
  private prisma: PrismaClient;
  private maxRetries = 5;
  private retryDelays = [60, 300, 900, 3600, 7200]; // 1min, 5min, 15min, 1hr, 2hr in seconds

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Queue webhook for delivery to all subscribed endpoints
   *
   * Finds all active webhook endpoints subscribed to the event type
   * and creates delivery records in PENDING status
   */
  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    data: Record<string, any>
  ): Promise<number> {
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

    // Queue delivery for each endpoint
    const deliveries = await Promise.all(
      endpoints.map((endpoint) =>
        this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            eventType,
            payload: payload as any,
            status: WebhookStatus.PENDING,
            attempts: 0,
            nextAttemptAt: new Date(), // Deliver immediately
          },
        })
      )
    );

    logger.info('Webhooks queued for delivery', {
      userId,
      eventType,
      endpointCount: endpoints.length,
      deliveryIds: deliveries.map((d) => d.id),
    });

    return deliveries.length;
  }

  /**
   * Process all pending and retry-ready webhook deliveries
   *
   * Fetches deliveries that are:
   * - PENDING status
   * - FAILED status with nextAttemptAt in the past (retries)
   *
   * Processes them concurrently with a limit
   */
  async processQueue(concurrencyLimit = 10): Promise<void> {
    const now = new Date();

    // Fetch deliveries ready to be sent
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        OR: [
          { status: WebhookStatus.PENDING },
          {
            status: WebhookStatus.FAILED,
            nextAttemptAt: {
              lte: now,
            },
            attempts: {
              lt: this.maxRetries,
            },
          },
        ],
      },
      include: {
        endpoint: true,
      },
      take: concurrencyLimit,
    });

    if (deliveries.length === 0) {
      return;
    }

    logger.info('Processing webhook queue', {
      count: deliveries.length,
    });

    // Process deliveries concurrently
    await Promise.allSettled(
      deliveries.map((delivery) => this.deliverWebhook(delivery))
    );
  }

  /**
   * Deliver a single webhook to its endpoint
   *
   * Steps:
   * 1. Update status to DELIVERING
   * 2. Sign payload with HMAC-SHA256
   * 3. Send HTTP POST request
   * 4. Update delivery record based on response
   * 5. Schedule retry if failed and under max retries
   */
  private async deliverWebhook(delivery: any): Promise<void> {
    const { id, endpoint, payload, attempts } = delivery;

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

      // Generate signature
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadString = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadString, endpoint.secret, timestamp);

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
      } else {
        // Delivery failed - determine if we should retry
        await this.handleDeliveryFailure(
          id,
          attempts + 1,
          response.status,
          responseBody,
          `HTTP ${response.status}: ${response.statusText}`
        );
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
