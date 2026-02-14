/**
 * Usage Tracking Service
 *
 * Tracks feature usage per user for metering and tier enforcement.
 * Uses Redis for high-frequency counters with DB persistence.
 */

import { logger } from '@connectsw/shared';

export interface UsageServiceOptions {
  /** Redis client for high-frequency counters. Optional — falls back to DB-only. */
  redis?: RedisUsageClient;
  /** Reset period in ms. Default: 30 days (billing cycle) */
  resetPeriodMs?: number;
}

/** Minimal Redis interface for usage counters */
interface RedisUsageClient {
  incrby(key: string, amount: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
}

/** Minimal Prisma client interface for usage tracking */
interface PrismaUsageClient {
  usageRecord: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<{ count: number }>;
    findUnique(args: { where: Record<string, unknown> }): Promise<{ count: number } | null>;
    findMany(args: { where: Record<string, unknown> }): Promise<Array<{ feature: string; count: number }>>;
  };
}

export class UsageService {
  private prisma: PrismaUsageClient;
  private redis: RedisUsageClient | null;
  private resetPeriodMs: number;

  constructor(prisma: PrismaUsageClient, opts?: UsageServiceOptions) {
    this.prisma = prisma;
    this.redis = opts?.redis ?? null;
    this.resetPeriodMs = opts?.resetPeriodMs ?? 30 * 24 * 60 * 60 * 1000;
  }

  /**
   * Increment usage counter for a feature.
   * Uses Redis for speed when available, with DB as source of truth.
   */
  async increment(userId: string, feature: string, amount = 1): Promise<number> {
    const periodStart = this.getCurrentPeriodStart();

    if (this.redis) {
      const key = `usage:${userId}:${feature}:${periodStart.toISOString()}`;
      const newCount = await this.redis.incrby(key, amount);
      // Set expiry slightly longer than billing period
      await this.redis.expire(key, Math.ceil(this.resetPeriodMs / 1000) + 86400);
      return newCount;
    }

    // DB-only fallback
    const record = await this.prisma.usageRecord.upsert({
      where: {
        userId_feature_periodStart: { userId, feature, periodStart },
      },
      create: { userId, feature, periodStart, count: amount },
      update: { count: { increment: amount } },
    });

    return record.count;
  }

  /** Get current usage count for a feature. */
  async getUsage(userId: string, feature: string): Promise<number> {
    const periodStart = this.getCurrentPeriodStart();

    if (this.redis) {
      const key = `usage:${userId}:${feature}:${periodStart.toISOString()}`;
      const count = await this.redis.get(key);
      if (count !== null) return parseInt(count, 10);
    }

    const record = await this.prisma.usageRecord.findUnique({
      where: {
        userId_feature_periodStart: { userId, feature, periodStart },
      },
    });

    return record?.count ?? 0;
  }

  /** Check if user has exceeded their limit for a feature. */
  async isOverLimit(userId: string, feature: string, limit: number): Promise<boolean> {
    if (limit === Infinity) return false;
    const usage = await this.getUsage(userId, feature);
    return usage >= limit;
  }

  /** Get all usage records for a user in the current period. */
  async getAllUsage(userId: string): Promise<Record<string, number>> {
    const periodStart = this.getCurrentPeriodStart();
    const records = await this.prisma.usageRecord.findMany({
      where: { userId, periodStart },
    });

    const result: Record<string, number> = {};
    for (const r of records) {
      result[r.feature] = r.count;
    }
    return result;
  }

  /** Sync Redis counters to DB (call periodically or on shutdown). */
  async syncToDb(userId: string, feature: string): Promise<void> {
    if (!this.redis) return;

    const periodStart = this.getCurrentPeriodStart();
    const key = `usage:${userId}:${feature}:${periodStart.toISOString()}`;
    const count = await this.redis.get(key);

    if (count !== null) {
      await this.prisma.usageRecord.upsert({
        where: { userId_feature_periodStart: { userId, feature, periodStart } },
        create: { userId, feature, periodStart, count: parseInt(count, 10) },
        update: { count: parseInt(count, 10) },
      });
    }
  }

  private getCurrentPeriodStart(): Date {
    const now = new Date();
    // Start of current month
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
