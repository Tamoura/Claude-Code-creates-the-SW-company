/**
 * Tier Service
 *
 * Enforces free-tier message limits (20/day) and provides
 * tier status information.
 *
 * [IMPL-084][FR-028]
 */

import { PrismaClient, UserTier } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Constants ----------

const FREE_TIER_DAILY_LIMIT = 20;

const UPGRADE_CTA =
  'You have reached your daily message limit. ' +
  'Upgrade to Pro for unlimited advisory messages.';

// ---------- Types ----------

export interface TierUserData {
  id: string;
  tier: UserTier;
  dailyMessageCount: number;
  dailyMessageResetDate: Date | null;
}

export interface MessageAllowance {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  tier: UserTier;
  needsReset?: boolean;
  upgradeCta?: string;
}

export interface TierStatus {
  tier: UserTier;
  messagesUsed: number;
  messagesLimit: number | null;
  messagesRemaining: number | null;
  isUnlimited: boolean;
}

// ---------- Service ----------

export class TierService {
  private prisma?: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check whether a user is allowed to send a message.
   * Pure logic -- no database calls.
   */
  checkMessageAllowance(user: TierUserData): MessageAllowance {
    // Pro and Enterprise tiers are unlimited
    if (user.tier === 'PRO' || user.tier === 'ENTERPRISE') {
      return {
        allowed: true,
        remaining: null,
        limit: null,
        tier: user.tier,
      };
    }

    // Free tier: check if counter needs reset (midnight UTC)
    const needsReset = this.shouldResetCounter(user.dailyMessageResetDate);
    const effectiveCount = needsReset ? 0 : user.dailyMessageCount;
    const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - effectiveCount);
    const allowed = effectiveCount < FREE_TIER_DAILY_LIMIT;

    const result: MessageAllowance = {
      allowed,
      remaining,
      limit: FREE_TIER_DAILY_LIMIT,
      tier: user.tier,
    };

    if (needsReset) {
      result.needsReset = true;
    }

    if (!allowed) {
      result.upgradeCta = UPGRADE_CTA;
    }

    return result;
  }

  /**
   * Get the complete tier status for display.
   * Pure logic -- no database calls.
   */
  getTierStatus(user: TierUserData): TierStatus {
    const isUnlimited =
      user.tier === 'PRO' || user.tier === 'ENTERPRISE';

    if (isUnlimited) {
      return {
        tier: user.tier,
        messagesUsed: user.dailyMessageCount,
        messagesLimit: null,
        messagesRemaining: null,
        isUnlimited: true,
      };
    }

    const needsReset = this.shouldResetCounter(
      user.dailyMessageResetDate
    );
    const effectiveCount = needsReset ? 0 : user.dailyMessageCount;

    return {
      tier: user.tier,
      messagesUsed: effectiveCount,
      messagesLimit: FREE_TIER_DAILY_LIMIT,
      messagesRemaining: Math.max(
        0,
        FREE_TIER_DAILY_LIMIT - effectiveCount
      ),
      isUnlimited: false,
    };
  }

  // ---------- DB-backed methods ----------

  /**
   * Increment message count for a user after a successful message.
   * Resets counter if date has changed.
   */
  async incrementMessageCount(userId: string): Promise<void> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tier: true,
        dailyMessageCount: true,
        dailyMessageResetDate: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Pro/Enterprise: still increment for analytics, no limit
    const needsReset = this.shouldResetCounter(
      user.dailyMessageResetDate
    );

    if (needsReset) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyMessageCount: 1,
          dailyMessageResetDate: this.todayUTC(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyMessageCount: { increment: 1 },
        },
      });
    }
  }

  /**
   * Get remaining messages for a user from the database.
   */
  async getRemainingMessages(
    userId: string
  ): Promise<MessageAllowance> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tier: true,
        dailyMessageCount: true,
        dailyMessageResetDate: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return this.checkMessageAllowance(user);
  }

  // ---------- Private helpers ----------

  private requirePrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('PrismaClient is required for this operation');
    }
    return this.prisma;
  }

  /**
   * Check whether the counter should be reset.
   * Returns true if resetDate is null or from a previous UTC day.
   */
  private shouldResetCounter(
    resetDate: Date | null
  ): boolean {
    if (!resetDate) return true;

    const today = this.todayUTC();
    const resetDay = new Date(resetDate);
    resetDay.setUTCHours(0, 0, 0, 0);

    return resetDay.getTime() < today.getTime();
  }

  /** Get today's date at midnight UTC. */
  private todayUTC(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
