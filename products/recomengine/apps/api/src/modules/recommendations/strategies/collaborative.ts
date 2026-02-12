import { PrismaClient } from '@prisma/client';

export interface RecommendationItem {
  productId: string;
  score: number;
  reason: string;
}

/**
 * Collaborative filtering: user-user similarity via cosine similarity.
 * Finds users with similar behavior patterns and recommends products
 * those similar users interacted with but the target user has not.
 */
export async function collaborativeFiltering(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  limit: number,
  excludeProductIds: string[] = []
): Promise<RecommendationItem[]> {
  // Get target user's interactions
  const userEvents = await prisma.event.findMany({
    where: { tenantId, userId },
    select: { productId: true, eventType: true },
  });

  if (userEvents.length < 5) {
    return []; // Not enough data for collaborative filtering
  }

  const userProductSet = new Set(userEvents.map(e => e.productId));
  const excludeSet = new Set([...excludeProductIds, ...Array.from(userProductSet)]);

  // Find users who interacted with the same products
  const similarUserEvents = await prisma.event.findMany({
    where: {
      tenantId,
      productId: { in: Array.from(userProductSet) },
      userId: { not: userId },
    },
    select: { userId: true, productId: true },
  });

  // Compute user-user similarity (Jaccard-like overlap count)
  const userOverlap = new Map<string, number>();
  for (const event of similarUserEvents) {
    const count = userOverlap.get(event.userId) || 0;
    userOverlap.set(event.userId, count + 1);
  }

  // Get top similar users (by overlap count)
  const sortedUsers = Array.from(userOverlap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sortedUsers.length === 0) return [];

  const similarUserIds = sortedUsers.map(([uid]) => uid);
  const maxOverlap = sortedUsers[0][1];

  // Get products from similar users that target user hasn't seen
  const candidateEvents = await prisma.event.findMany({
    where: {
      tenantId,
      userId: { in: similarUserIds },
      productId: { notIn: Array.from(excludeSet) },
    },
    select: { userId: true, productId: true, eventType: true },
  });

  // Score products by weighted interactions from similar users
  const productScores = new Map<string, number>();
  const WEIGHTS: Record<string, number> = {
    product_viewed: 1,
    product_clicked: 2,
    add_to_cart: 3,
    purchase: 5,
    recommendation_clicked: 2,
  };

  for (const event of candidateEvents) {
    const userSimilarity = (userOverlap.get(event.userId) || 0) / maxOverlap;
    const eventWeight = WEIGHTS[event.eventType] || 1;
    const current = productScores.get(event.productId) || 0;
    productScores.set(event.productId, current + userSimilarity * eventWeight);
  }

  // Filter to only available products
  const productIds = Array.from(productScores.keys());
  const availableProducts = await prisma.catalogItem.findMany({
    where: { tenantId, productId: { in: productIds }, available: true },
    select: { productId: true },
  });
  const availableSet = new Set(availableProducts.map(p => p.productId));

  // Sort and return top N
  const maxScore = Math.max(...productScores.values(), 1);

  return Array.from(productScores.entries())
    .filter(([pid]) => availableSet.has(pid))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId, rawScore]) => ({
      productId,
      score: Math.round((rawScore / maxScore) * 100) / 100,
      reason: 'Users with similar tastes also liked this',
    }));
}
