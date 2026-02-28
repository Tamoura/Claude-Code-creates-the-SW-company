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
      // Use the transaction ONLY for claiming refunds (SELECT FOR UPDATE
      // SKIP LOCKED + status transition to PROCESSING). This keeps the
      // DB transaction short (~milliseconds). Blockchain calls happen
      // OUTSIDE the transaction to avoid holding DB connections open for
      // 30+ seconds per refund.
      const claimedRefunds = await this.prisma.$transaction(async (tx) => {
        const pendingRefunds = await tx.$queryRaw<Array<{ id: string; user_id: string }>>`
          SELECT r.id, ps.user_id
          FROM "refunds" r
          INNER JOIN "payment_sessions" ps ON r.payment_session_id = ps.id
          WHERE r.status = 'PENDING'
          ORDER BY r."created_at" ASC
          LIMIT ${BATCH_SIZE}
          FOR UPDATE OF r SKIP LOCKED
        `;

        if (
          !Array.isArray(pendingRefunds) ||
          pendingRefunds.length === 0
        ) {
          return [];
        }

        // Mark claimed refunds as PROCESSING so other workers skip them
        const claimedIds = pendingRefunds.map((r) => r.id);
        await tx.$executeRaw`
          UPDATE "refunds"
          SET status = 'PROCESSING', updated_at = NOW()
          WHERE id = ANY(${claimedIds}::text[])
        `;

        return pendingRefunds;
      });

      if (claimedRefunds.length === 0) {
        return;
      }

      // Process each claimed refund OUTSIDE the transaction.
      // processRefund makes blockchain calls that can take 30+ seconds.
      let processed = 0;
      let failed = 0;

      for (const refund of claimedRefunds) {
        try {
          await this.refundService.processRefund(refund.id, refund.user_id);
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
        total: claimedRefunds.length,
        processed,
        failed,
      });
    } catch (error) {
      logger.error(
        'Refund processing worker failed',
        error instanceof Error ? error : undefined,
      );
    } finally {
      // Atomic compare-and-delete via Lua script to prevent TOCTOU race
      // where another instance acquires the lock between GET and DEL.
      await this.redis.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
        1,
        lockKey,
        lockValue,
      );
    }
  }

  /**
   * Fallback processing path when Redis is unavailable.
   * Uses the original Prisma findMany without distributed locking.
   */
  private async processPendingRefundsUnlocked(): Promise<void> {
    const pendingRefunds = await this.prisma.refund.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
      include: { paymentSession: { select: { userId: true } } },
    });

    if (pendingRefunds.length === 0) {
      return;
    }

    let processed = 0;
    let failed = 0;

    for (const refund of pendingRefunds) {
      try {
        await this.refundService.processRefund(refund.id, refund.paymentSession.userId);
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
