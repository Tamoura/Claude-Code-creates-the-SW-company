import Redis from 'ioredis';
import { RecommendationItem } from './strategies/collaborative';

const DEFAULT_TTL = 300; // 5 minutes
const TRENDING_TTL = 900; // 15 minutes
const FBT_TTL = 1800; // 30 minutes

function getKey(tenantId: string, userId: string, strategy: string): string {
  return `reco:${tenantId}:${userId}:${strategy}`;
}

function getTrendingKey(tenantId: string): string {
  return `reco:trending:${tenantId}`;
}

function getFbtKey(tenantId: string, productId: string): string {
  return `reco:fbt:${tenantId}:${productId}`;
}

export async function getCachedRecommendations(
  redis: Redis | null,
  tenantId: string,
  userId: string,
  strategy: string,
  productId?: string
): Promise<RecommendationItem[] | null> {
  if (!redis) return null;

  let key: string;
  if (strategy === 'trending') {
    key = getTrendingKey(tenantId);
  } else if (strategy === 'frequently_bought_together' && productId) {
    key = getFbtKey(tenantId, productId);
  } else {
    key = getKey(tenantId, userId, strategy);
  }

  const cached = await redis.get(key);
  if (!cached) return null;

  try {
    return JSON.parse(cached) as RecommendationItem[];
  } catch {
    return null;
  }
}

export async function cacheRecommendations(
  redis: Redis | null,
  tenantId: string,
  userId: string,
  strategy: string,
  recommendations: RecommendationItem[],
  productId?: string
): Promise<void> {
  if (!redis) return;

  let key: string;
  let ttl: number;

  if (strategy === 'trending') {
    key = getTrendingKey(tenantId);
    ttl = TRENDING_TTL;
  } else if (strategy === 'frequently_bought_together' && productId) {
    key = getFbtKey(tenantId, productId);
    ttl = FBT_TTL;
  } else {
    key = getKey(tenantId, userId, strategy);
    ttl = DEFAULT_TTL;
  }

  await redis.setex(key, ttl, JSON.stringify(recommendations));
}
