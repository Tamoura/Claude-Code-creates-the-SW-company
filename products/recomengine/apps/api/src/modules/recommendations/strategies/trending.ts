import { PrismaClient } from '@prisma/client';
import { RecommendationItem } from './collaborative';

/**
 * Trending strategy: ranks products by interaction velocity in the last 24 hours.
 * Weighted: views=1, clicks=2, add-to-cart=3, purchases=5.
 * Global to the tenant (not personalized per user).
 */
export async function trendingProducts(
  prisma: PrismaClient,
  tenantId: string,
  limit: number,
  excludeProductIds: string[] = []
): Promise<RecommendationItem[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent events
  const recentEvents = await prisma.event.findMany({
    where: {
      tenantId,
      timestamp: { gte: twentyFourHoursAgo },
      ...(excludeProductIds.length > 0 ? { productId: { notIn: excludeProductIds } } : {}),
    },
    select: { productId: true, eventType: true },
  });

  if (recentEvents.length === 0) {
    // Fallback: get popular products from all time
    const popularItems = await prisma.catalogItem.findMany({
      where: { tenantId, available: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return popularItems.map((item, i) => ({
      productId: item.productId,
      score: Math.round((1 - i / Math.max(popularItems.length, 1)) * 100) / 100,
      reason: 'Newly added product',
    }));
  }

  const WEIGHTS: Record<string, number> = {
    product_viewed: 1,
    product_clicked: 2,
    add_to_cart: 3,
    remove_from_cart: 0,
    purchase: 5,
    recommendation_clicked: 2,
    recommendation_impressed: 0,
  };

  // Score products by weighted event velocity
  const productScores = new Map<string, number>();
  for (const event of recentEvents) {
    const weight = WEIGHTS[event.eventType] || 0;
    if (weight > 0) {
      const current = productScores.get(event.productId) || 0;
      productScores.set(event.productId, current + weight);
    }
  }

  // Filter to available products
  const productIds = Array.from(productScores.keys());
  const availableProducts = await prisma.catalogItem.findMany({
    where: { tenantId, productId: { in: productIds }, available: true },
    select: { productId: true },
  });
  const availableSet = new Set(availableProducts.map(p => p.productId));

  const maxScore = Math.max(...productScores.values(), 1);

  return Array.from(productScores.entries())
    .filter(([pid]) => availableSet.has(pid))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId, rawScore]) => ({
      productId,
      score: Math.round((rawScore / maxScore) * 100) / 100,
      reason: 'Trending right now',
    }));
}
