/**
 * Payment Expiration Worker
 *
 * Periodically scans for PENDING payment sessions that have passed
 * their expiresAt timestamp and marks them as FAILED.
 *
 * This prevents database bloat from abandoned payment sessions and
 * mitigates abuse from attackers creating thousands of sessions.
 *
 * Note: The PaymentStatus enum does not include EXPIRED, so we use
 * FAILED status. The webhook payload includes an `expired` flag and
 * `reason` field to distinguish expiration from other failure modes.
 */

import { PrismaClient } from '@prisma/client';
import { WebhookDeliveryService } from '../services/webhook-delivery.service.js';
import { logger } from '../utils/logger.js';

export class PaymentExpirationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly webhookService?: WebhookDeliveryService,
    intervalMinutes: number = 5
  ) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  /**
   * Start the worker. Runs immediately then on the configured interval.
   */
  start(): void {
    // Run immediately on start
    this.processExpiredPayments().catch((err) =>
      logger.error('Payment expiration error', err)
    );

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processExpiredPayments().catch((err) =>
        logger.error('Payment expiration error', err)
      );
    }, this.intervalMs);
  }

  /**
   * Stop the worker interval.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if the worker interval is currently running.
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get the configured interval in milliseconds.
   */
  getIntervalMs(): number {
    return this.intervalMs;
  }

  /**
   * Find and expire all PENDING payment sessions past their expiresAt.
   *
   * Two-step approach:
   * 1. Find expired sessions (to get IDs for webhooks)
   * 2. Update them to FAILED in bulk
   *
   * Returns the number of expired sessions.
   */
  async processExpiredPayments(): Promise<number> {
    const now = new Date();

    // Step 1: Find expired PENDING sessions
    const expiredSessions = await this.prisma.paymentSession.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
    });

    if (expiredSessions.length === 0) {
      return 0;
    }

    const expiredIds = expiredSessions.map((s) => s.id);

    // Step 2: Update all expired sessions to FAILED in bulk
    const result = await this.prisma.paymentSession.updateMany({
      where: {
        id: { in: expiredIds },
        status: 'PENDING', // Double-check to avoid race conditions
      },
      data: {
        status: 'FAILED',
      },
    });

    logger.info(`Expired ${result.count} stale payment sessions`, {
      count: result.count,
      sessionIds: expiredIds,
    });

    // Step 3: Queue payment.failed webhooks for each expired session
    if (this.webhookService) {
      for (const session of expiredSessions) {
        try {
          await this.webhookService.queueWebhook(
            session.userId,
            'payment.failed',
            {
              id: session.id,
              amount: Number(session.amount),
              currency: session.currency,
              status: 'FAILED',
              network: session.network,
              token: session.token,
              merchant_address: session.merchantAddress,
              created_at: session.createdAt.toISOString(),
              expired: true,
              reason: 'Payment session expired',
              expired_at: now.toISOString(),
              metadata: session.metadata,
            }
          );
        } catch (err) {
          logger.error(
            `Failed to queue webhook for expired session ${session.id}`,
            err
          );
          // Continue processing other sessions
        }
      }
    }

    return result.count;
  }
}
