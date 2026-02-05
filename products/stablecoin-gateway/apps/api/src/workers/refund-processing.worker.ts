/**
 * Refund Processing Worker
 *
 * Polls for PENDING refunds and processes them by calling
 * refundService.processRefund(). Runs on a 30-second interval.
 *
 * Design:
 * - Uses Redis distributed lock to prevent multiple instances
 *   from processing the same refunds simultaneously.
 * - Uses FOR UPDATE SKIP LOCKED to claim individual refunds
 *   at the row level, providing double-spend protection.
 * - Batch size capped at 10 per run to avoid overwhelming the
 *   blockchain service with concurrent transactions.
 * - Each refund is wrapped in its own try/catch so a single
 *   failure does not block the rest of the batch.
 * - Oldest refunds are processed first (createdAt ASC).
 * - If Redis is unavailable, falls back to unlocked behavior
 *   with a warning (single-instance only safety).
 */

import { PrismaClient } from '@prisma/client';
import { RefundService } from '../services/refund.service.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = 10;
const INTERVAL_MS = 30_000; // 30 seconds
const LOCK_TTL_MS = 60_000; // 60 seconds

export class RefundProcessingWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private redis: any | null;

  constructor(
    private prisma: PrismaClient,
    private refundService: RefundService,
    redis?: any,
  ) {
    this.redis = redis ?? null;
  }

  /**
   * Query for PENDING refunds and process each one.
   * Public so it can be called directly in tests.
   *
   * When Redis is available, acquires a distributed lock before
   * processing and uses FOR UPDATE SKIP LOCKED for row-level
   * claim safety. When Redis is unavailable, falls back to the
   * original unlocked findMany behavior.
   */
  async processPendingRefunds(): Promise<void> {
    if (!this.redis) {
      logger.warn(
        'Refund worker: Redis unavailable, running without distributed lock',
      );
      await this.processPendingRefundsUnlocked();
      return;
    }

    const lockKey = 'lock:refund-worker';
    const lockValue = `${process.pid}:${Date.now()}`;

    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      LOCK_TTL_MS,
      'NX',
    );

    if (!acquired) {
      logger.debug(
        'Refund worker: another instance holds the lock, skipping',
      );
      return;
    }

    try {
      // RISK-089: Claim refund IDs in a short transaction, then process
      // outside the transaction so the FOR UPDATE lock is held only briefly.
      // This prevents lock starvation when processing takes longer than expected.
      const pendingRefunds = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Refund"
          WHERE status = 'PENDING'
          ORDER BY "createdAt" ASC
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        `;

        if (!Array.isArray(rows) || rows.length === 0) {
          return [];
        }

        // Mark as PROCESSING to prevent other workers from picking them up
        const ids = rows.map((r) => r.id);
        await tx.$executeRaw`
          UPDATE "Refund" SET status = 'PROCESSING'
          WHERE id = ANY(${ids}::text[])
        `;

        return ids;
      }, { timeout: 10_000 }); // Short timeout for claim-only transaction

      if (pendingRefunds.length === 0) {
        return; // early return inside finally is fine — lock is released below
      }

      let processed = 0;
      let failed = 0;

      for (const refundId of pendingRefunds) {
        try {
          await this.refundService.processRefund(refundId);
          processed++;
        } catch (error) {
          failed++;
          // Reset back to PENDING so it can be retried
          try {
            await this.prisma.refund.update({
              where: { id: refundId },
              data: { status: 'PENDING' },
            });
          } catch {
            // If reset fails, the refund stays in PROCESSING and will need manual intervention
          }
          logger.error(
            `Failed to process refund ${refundId}`,
            error instanceof Error ? error : undefined,
          );
        }
      }

      logger.info('Refund processing batch complete', {
        total: pendingRefunds.length,
        processed,
        failed,
      });
    } catch (error) {
      logger.error(
        'Refund processing worker failed',
        error instanceof Error ? error : undefined,
      );
    } finally {
      // Release lock only if we still own it
      const currentValue = await this.redis.get(lockKey);
      if (currentValue === lockValue) {
        await this.redis.del(lockKey);
      }
    }
  }

  /**
   * Fallback processing path when Redis is unavailable.
   * Uses the original Prisma findMany without distributed locking.
   */
  private async processPendingRefundsUnlocked(): Promise<void> {
    // RISK-090: Use UPDATE ... RETURNING to atomically claim refunds at the DB level.
    // This prevents duplicate processing when multiple workers run without Redis.
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Refund" SET status = 'PROCESSING'
      WHERE id IN (
        SELECT id FROM "Refund"
        WHERE status = 'PENDING'
        ORDER BY "createdAt" ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;

    if (!Array.isArray(claimed) || claimed.length === 0) {
      return;
    }

    let processed = 0;
    let failed = 0;

    for (const refund of claimed) {
      try {
        await this.refundService.processRefund(refund.id);
        processed++;
      } catch (error) {
        failed++;
        try {
          await this.prisma.refund.update({
            where: { id: refund.id },
            data: { status: 'PENDING' },
          });
        } catch {
          // If reset fails, refund stays in PROCESSING for manual intervention
        }
        logger.error(
          `Failed to process refund ${refund.id}`,
          error instanceof Error ? error : undefined,
        );
      }
    }

    logger.info('Refund processing batch complete', {
      total: claimed.length,
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
