import { PrismaClient } from '@prisma/client';
import { RecommendationItem } from './collaborative';

/**
 * Content-based filtering: product similarity from catalog attributes.
 * Recommends products similar to ones the user has interacted with
 * based on category, price range, and shared attributes.
 */
export async function contentBasedFiltering(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  limit: number,
  excludeProductIds: string[] = []
): Promise<RecommendationItem[]> {
  // Get user's recently interacted products
  const userEvents = await prisma.event.findMany({
    where: { tenantId, userId },
    select: { productId: true, eventType: true },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  if (userEvents.length === 0) return [];

  const interactedProductIds = [...new Set(userEvents.map(e => e.productId))];
  const excludeSet = new Set([...excludeProductIds, ...interactedProductIds]);

  // Get catalog details for interacted products
  const interactedItems = await prisma.catalogItem.findMany({
    where: { tenantId, productId: { in: interactedProductIds } },
  });

  if (interactedItems.length === 0) return [];

  // Extract user's preference profile
  const categoryFreq = new Map<string, number>();
  const priceRange = { min: Infinity, max: -Infinity };

  for (const item of interactedItems) {
    if (item.category) {
      categoryFreq.set(item.category, (categoryFreq.get(item.category) || 0) + 1);
    }
    if (item.price) {
      const price = Number(item.price);
      priceRange.min = Math.min(priceRange.min, price);
      priceRange.max = Math.max(priceRange.max, price);
    }
  }

  // Get candidate products from matching categories
  const topCategories = Array.from(categoryFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const candidates = await prisma.catalogItem.findMany({
    where: {
      tenantId,
      available: true,
      productId: { notIn: Array.from(excludeSet) },
      ...(topCategories.length > 0 ? { category: { in: topCategories } } : {}),
    },
    take: limit * 5, // Over-fetch to score and filter
  });

  // Score candidates by attribute similarity
  const scored = candidates.map(candidate => {
    let score = 0;

    // Category match bonus
    if (candidate.category && categoryFreq.has(candidate.category)) {
      score += 0.4 * ((categoryFreq.get(candidate.category) || 0) / interactedItems.length);
    }

    // Price range proximity bonus
    if (candidate.price && priceRange.min !== Infinity) {
      const price = Number(candidate.price);
      const range = priceRange.max - priceRange.min || 1;
      const midPrice = (priceRange.min + priceRange.max) / 2;
      const distance = Math.abs(price - midPrice) / range;
      score += 0.3 * Math.max(0, 1 - distance);
    }

    // Attribute overlap bonus
    const candidateAttrs = candidate.attributes as Record<string, unknown>;
    if (candidateAttrs && Object.keys(candidateAttrs).length > 0) {
      for (const item of interactedItems) {
        const itemAttrs = item.attributes as Record<string, unknown>;
        if (itemAttrs) {
          const sharedKeys = Object.keys(candidateAttrs).filter(
            k => k in itemAttrs && JSON.stringify(candidateAttrs[k]) === JSON.stringify(itemAttrs[k])
          );
          if (sharedKeys.length > 0) {
            score += 0.3 * (sharedKeys.length / Math.max(Object.keys(candidateAttrs).length, 1));
          }
        }
      }
    }

    return { productId: candidate.productId, score: Math.min(score, 1) };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => ({
      productId: s.productId,
      score: Math.round(s.score * 100) / 100,
      reason: 'Similar to products you\'ve shown interest in',
    }));
}
