import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  subscriptionTier: string;
  invoiceCountThisMonth: number;
  stripeConnected: boolean;
  createdAt: Date;
}

export interface SubscriptionInfo {
  tier: string;
  invoicesUsed: number;
  invoicesRemaining: number | null;
  resetDate: Date;
}

function toProfile(user: {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  subscriptionTier: string;
  invoiceCountThisMonth: number;
  stripeAccountId: string | null;
  createdAt: Date;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    businessName: user.businessName,
    subscriptionTier: user.subscriptionTier,
    invoiceCountThisMonth: user.invoiceCountThisMonth,
    stripeConnected: !!user.stripeAccountId,
    createdAt: user.createdAt,
  };
}

export async function getProfile(
  db: PrismaClient,
  userId: string
): Promise<UserProfile> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      businessName: true,
      subscriptionTier: true,
      invoiceCountThisMonth: true,
      stripeAccountId: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return toProfile(user);
}

export async function updateProfile(
  db: PrismaClient,
  userId: string,
  input: { name?: string; businessName?: string }
): Promise<UserProfile> {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.businessName !== undefined) {
    data.businessName = input.businessName;
  }

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      businessName: true,
      subscriptionTier: true,
      invoiceCountThisMonth: true,
      stripeAccountId: true,
      createdAt: true,
    },
  });

  return toProfile(user);
}

const TIER_LIMITS: Record<string, number | null> = {
  free: 5,
  pro: null,
  team: null,
};

export async function getSubscription(
  db: PrismaClient,
  userId: string
): Promise<SubscriptionInfo> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      invoiceCountThisMonth: true,
      counterResetAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const limit = TIER_LIMITS[user.subscriptionTier] ?? null;

  return {
    tier: user.subscriptionTier,
    invoicesUsed: user.invoiceCountThisMonth,
    invoicesRemaining: limit !== null
      ? Math.max(0, limit - user.invoiceCountThisMonth)
      : null,
    resetDate: user.counterResetAt,
  };
}
