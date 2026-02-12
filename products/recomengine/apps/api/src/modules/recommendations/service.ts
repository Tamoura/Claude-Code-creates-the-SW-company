import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { collaborativeFiltering, RecommendationItem } from './strategies/collaborative';
import { contentBasedFiltering } from './strategies/content-based';
import { trendingProducts } from './strategies/trending';
import { frequentlyBoughtTogether } from './strategies/fbt';
import { getCachedRecommendations, cacheRecommendations } from './cache';
import { getExperimentAssignment } from '../experiments/assignment';

export interface RecommendationResult {
  data: Array<RecommendationItem & { name?: string; imageUrl?: string | null; price?: number | null }>;
  meta: {
    strategy: string;
    isFallback: boolean;
    experimentId?: string | null;
    variant?: string | null;
    cached: boolean;
  };
}

const COLD_START_THRESHOLD = 5;

export async function getRecommendations(
  prisma: PrismaClient,
  redis: Redis | null,
  tenantId: string,
  userId: string,
  limit: number,
  requestedStrategy?: string,
  productId?: string,
  placementId?: string
): Promise<RecommendationResult> {
  // Determine strategy (experiment, request override, or tenant default)
  let strategy = requestedStrategy;
  let experimentId: string | null = null;
  let variant: string | null = null;
  let isFallback = false;

  // Check for active experiment on this placement
  if (placementId && !requestedStrategy) {
    const experiment = await prisma.experiment.findFirst({
      where: { tenantId, placementId, status: 'running' },
    });

    if (experiment) {
      const assignment = getExperimentAssignment(userId, experiment.id, experiment.trafficSplit);
      experimentId = experiment.id;
      variant = assignment.variant;
      strategy = assignment.variant === 'control' ? experiment.controlStrategy : experiment.variantStrategy;
    }
  }

  // Get tenant default strategy if none specified
  if (!strategy) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const config = tenant?.config as { defaultStrategy?: string } | null;
    strategy = config?.defaultStrategy || 'trending';
  }

  // Cold-start check: fall back to trending if user has too few events
  if (strategy !== 'trending') {
    const eventCount = await prisma.event.count({
      where: { tenantId, userId },
    });

    if (eventCount < COLD_START_THRESHOLD) {
      strategy = 'trending';
      isFallback = true;
    }
  }

  // Check cache
  const cached = await getCachedRecommendations(redis, tenantId, userId, strategy, productId);
  if (cached) {
    const enriched = await enrichWithCatalog(prisma, tenantId, cached.slice(0, limit));
    return {
      data: enriched,
      meta: { strategy, isFallback, experimentId, variant, cached: true },
    };
  }

  // Execute strategy
  let recommendations: RecommendationItem[] = [];

  switch (strategy) {
    case 'collaborative':
      recommendations = await collaborativeFiltering(prisma, tenantId, userId, limit);
      if (recommendations.length === 0) {
        // Fallback to content-based, then trending
        recommendations = await contentBasedFiltering(prisma, tenantId, userId, limit);
        if (recommendations.length === 0) {
          recommendations = await trendingProducts(prisma, tenantId, limit);
          isFallback = true;
        }
      }
      break;

    case 'content_based':
      recommendations = await contentBasedFiltering(prisma, tenantId, userId, limit);
      if (recommendations.length === 0) {
        recommendations = await trendingProducts(prisma, tenantId, limit);
        isFallback = true;
      }
      break;

    case 'trending':
      recommendations = await trendingProducts(prisma, tenantId, limit);
      break;

    case 'frequently_bought_together':
      if (!productId) {
        recommendations = await trendingProducts(prisma, tenantId, limit);
        isFallback = true;
      } else {
        recommendations = await frequentlyBoughtTogether(prisma, tenantId, productId, limit);
        if (recommendations.length === 0) {
          recommendations = await trendingProducts(prisma, tenantId, limit);
          isFallback = true;
        }
      }
      break;

    default:
      recommendations = await trendingProducts(prisma, tenantId, limit);
      isFallback = true;
  }

  // Cache the results
  await cacheRecommendations(redis, tenantId, userId, strategy, recommendations, productId);

  // Enrich with catalog data
  const enriched = await enrichWithCatalog(prisma, tenantId, recommendations.slice(0, limit));

  return {
    data: enriched,
    meta: { strategy, isFallback, experimentId, variant, cached: false },
  };
}

async function enrichWithCatalog(
  prisma: PrismaClient,
  tenantId: string,
  recommendations: RecommendationItem[]
): Promise<Array<RecommendationItem & { name?: string; imageUrl?: string | null; price?: number | null }>> {
  if (recommendations.length === 0) return [];

  const productIds = recommendations.map(r => r.productId);
  const catalogItems = await prisma.catalogItem.findMany({
    where: { tenantId, productId: { in: productIds } },
    select: { productId: true, name: true, imageUrl: true, price: true },
  });

  const catalogMap = new Map(catalogItems.map(item => [item.productId, item]));

  return recommendations.map(rec => {
    const catalog = catalogMap.get(rec.productId);
    return {
      ...rec,
      name: catalog?.name,
      imageUrl: catalog?.imageUrl,
      price: catalog?.price ? Number(catalog.price) : null,
    };
  });
}
