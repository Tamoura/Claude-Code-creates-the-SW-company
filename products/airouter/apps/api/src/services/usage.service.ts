import { PrismaClient } from '@prisma/client';
import { getProviderBySlug } from '../data/providers.js';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export class UsageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Record a request and token usage for a provider.
   */
  async recordUsage(userId: string, provider: string, tokens: number): Promise<void> {
    const date = todayStr();
    await this.prisma.usageRecord.upsert({
      where: { userId_provider_date: { userId, provider, date } },
      update: {
        requestCount: { increment: 1 },
        tokenCount: { increment: tokens },
      },
      create: {
        userId,
        provider,
        date,
        requestCount: 1,
        tokenCount: tokens,
      },
    });
  }

  /**
   * Get today's usage for a user and provider.
   */
  async getTodayUsage(userId: string, provider: string): Promise<{ requestCount: number; tokenCount: number }> {
    const date = todayStr();
    const record = await this.prisma.usageRecord.findUnique({
      where: { userId_provider_date: { userId, provider, date } },
    });
    return {
      requestCount: record?.requestCount ?? 0,
      tokenCount: record?.tokenCount ?? 0,
    };
  }

  /**
   * Get all usage records for a user, optionally filtered by provider.
   */
  async getUsageStats(userId: string, provider?: string): Promise<Array<{
    provider: string;
    date: string;
    requestCount: number;
    tokenCount: number;
    remaining: { requests?: number; tokens?: number } | null;
  }>> {
    const where: any = { userId };
    if (provider) {
      where.provider = provider;
    }

    const records = await this.prisma.usageRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { provider: 'asc' }],
      take: 100,
    });

    return records.map(record => {
      const providerInfo = getProviderBySlug(record.provider);
      let remaining: { requests?: number; tokens?: number } | null = null;

      if (providerInfo) {
        remaining = {};
        if (providerInfo.freeTier.requestsPerDay) {
          remaining.requests = Math.max(0, providerInfo.freeTier.requestsPerDay - record.requestCount);
        }
        if (providerInfo.freeTier.tokensPerDay) {
          remaining.tokens = Math.max(0, providerInfo.freeTier.tokensPerDay - record.tokenCount);
        }
      }

      return {
        provider: record.provider,
        date: record.date,
        requestCount: record.requestCount,
        tokenCount: record.tokenCount,
        remaining,
      };
    });
  }

  /**
   * Estimate remaining capacity for a user's provider key.
   * Returns a score 0-1 where 1 = fully available, 0 = exhausted.
   */
  async getRemainingCapacity(userId: string, provider: string): Promise<number> {
    const providerInfo = getProviderBySlug(provider);
    if (!providerInfo) return 0;

    if (providerInfo.freeTier.unlimited) return 1.0;

    const usage = await this.getTodayUsage(userId, provider);

    // Check request limits
    if (providerInfo.freeTier.requestsPerDay) {
      const remaining = providerInfo.freeTier.requestsPerDay - usage.requestCount;
      if (remaining <= 0) return 0;
      return remaining / providerInfo.freeTier.requestsPerDay;
    }

    if (providerInfo.freeTier.tokensPerDay) {
      const remaining = providerInfo.freeTier.tokensPerDay - usage.tokenCount;
      if (remaining <= 0) return 0;
      return remaining / providerInfo.freeTier.tokensPerDay;
    }

    // Monthly limits: simplified estimate (divide by 30)
    if (providerInfo.freeTier.requestsPerMonth) {
      const dailyBudget = Math.floor(providerInfo.freeTier.requestsPerMonth / 30);
      const remaining = dailyBudget - usage.requestCount;
      if (remaining <= 0) return 0;
      return remaining / dailyBudget;
    }

    return 0.5; // Default capacity if limits are unknown
  }
}
