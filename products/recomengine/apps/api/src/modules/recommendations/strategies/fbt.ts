import { PrismaClient } from '@prisma/client';
import { RecommendationItem } from './collaborative';

/**
 * Frequently Bought Together: co-occurrence analysis.
 * Products purchased in the same session or by the same user within 7 days.
 * Requires a productId context parameter.
 */
export async function frequentlyBoughtTogether(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
  limit: number,
  excludeProductIds: string[] = []
): Promise<RecommendationItem[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const excludeSet = new Set([...excludeProductIds, productId]);

  // Find users who purchased the context product
  const purchaseEvents = await prisma.event.findMany({
    where: {
      tenantId,
      productId,
      eventType: 'purchase',
      timestamp: { gte: sevenDaysAgo },
    },
    select: { userId: true, sessionId: true, timestamp: true },
  });

  if (purchaseEvents.length === 0) return [];

  const userIds = [...new Set(purchaseEvents.map(e => e.userId))];

  // Find other products these users also purchased (co-occurrence)
  const coPurchases = await prisma.event.findMany({
    where: {
      tenantId,
      userId: { in: userIds },
      eventType: 'purchase',
      productId: { notIn: Array.from(excludeSet) },
      timestamp: { gte: sevenDaysAgo },
    },
    select: { productId: true, userId: true },
  });

  // Count co-occurrence
  const coOccurrence = new Map<string, number>();
  for (const event of coPurchases) {
    const count = coOccurrence.get(event.productId) || 0;
    coOccurrence.set(event.productId, count + 1);
  }

  // Filter to available products
  const productIds = Array.from(coOccurrence.keys());
  const availableProducts = await prisma.catalogItem.findMany({
    where: { tenantId, productId: { in: productIds }, available: true },
    select: { productId: true },
  });
  const availableSet = new Set(availableProducts.map(p => p.productId));

  const maxCount = Math.max(...coOccurrence.values(), 1);

  return Array.from(coOccurrence.entries())
    .filter(([pid]) => availableSet.has(pid))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pid, count]) => ({
      productId: pid,
      score: Math.round((count / maxCount) * 100) / 100,
      reason: 'Frequently bought together',
    }));
}
