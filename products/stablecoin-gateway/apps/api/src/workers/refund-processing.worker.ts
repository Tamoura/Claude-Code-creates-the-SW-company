/**
 * Refund Processing Worker
 *
 * Polls for PENDING refunds and processes them by calling
 * refundService.processRefund(). Runs on a 30-second interval.
 *
 * Design:
 * - Batch size capped at 10 per run to avoid overwhelming the
 *   blockchain service with concurrent transactions.
 * - Each refund is wrapped in its own try/catch so a single
 *   failure does not block the rest of the batch.
 * - Oldest refunds are processed first (createdAt ASC).
 */

import { PrismaClient } from '@prisma/client';
import { RefundService } from '../services/refund.service.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = 10;
const INTERVAL_MS = 30_000; // 30 seconds

export class RefundProcessingWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaClient,
    private refundService: RefundService,
  ) {}

  /**
   * Query for PENDING refunds and process each one.
   * Public so it can be called directly in tests.
   */
  async processPendingRefunds(): Promise<void> {
    const pendingRefunds = await this.prisma.refund.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (pendingRefunds.length === 0) {
      return;
    }

    let processed = 0;
    let failed = 0;

    for (const refund of pendingRefunds) {
      try {
        await this.refundService.processRefund(refund.id);
        processed++;
      } catch (error) {
        failed++;
        logger.error(
          `Failed to process refund ${refund.id}`,
          error instanceof Error ? error : undefined,
        );
      }
    }

    logger.info('Refund processing batch complete', {
      total: pendingRefunds.length,
      processed,
      failed,
    });
  }

  /**
   * Start the worker on a recurring interval.
   * Calling start() twice is a no-op.
   */
  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    logger.info('Refund processing worker started', {
      intervalMs: INTERVAL_MS,
      batchSize: BATCH_SIZE,
    });

    this.intervalId = setInterval(() => {
      this.processPendingRefunds().catch((error) => {
        logger.error('Refund processing worker tick failed', error);
      });
    }, INTERVAL_MS);
  }

  /**
   * Stop the worker.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Refund processing worker stopped');
    }
  }
}
