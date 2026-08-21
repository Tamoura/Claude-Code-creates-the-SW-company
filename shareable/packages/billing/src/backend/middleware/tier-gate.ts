/**
 * Tier Gate Middleware
 *
 * Fastify preHandler that enforces feature access based on subscription tier.
 * Rejects requests with 403 if the user's plan doesn't include the feature.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { SubscriptionService } from '../services/subscription.service.js';
import { UsageService } from '../services/usage.service.js';

export interface TierGateOptions {
  subscriptionService: SubscriptionService;
  usageService?: UsageService;
}

/**
 * Create a preHandler that checks if the user has access to a feature.
 * Usage: `{ preHandler: requireFeature('ai_insights') }`
 */
export function requireFeature(feature: string, opts: TierGateOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).currentUser?.id;
    if (!userId) {
      return reply.code(401).send({ status: 401, detail: 'Authentication required' });
    }

    const hasAccess = await opts.subscriptionService.hasFeature(userId, feature);
    if (!hasAccess) {
      return reply.code(403).send({
        status: 403,
        detail: `Your plan does not include "${feature}". Please upgrade to access this feature.`,
        code: 'feature-not-available',
        feature,
      });
    }
  };
}

/**
 * Create a preHandler that checks feature usage limits.
 * Usage: `{ preHandler: requireUsageLimit('api_calls', 1000) }`
 *
 * If usageService is provided, also increments the counter.
 */
export function requireUsageLimit(feature: string, opts: TierGateOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).currentUser?.id;
    if (!userId) {
      return reply.code(401).send({ status: 401, detail: 'Authentication required' });
    }

    const limit = await opts.subscriptionService.getFeatureLimit(userId, feature);

    if (opts.usageService) {
      const overLimit = await opts.usageService.isOverLimit(userId, feature, limit);
      if (overLimit) {
        return reply.code(429).send({
          status: 429,
          detail: `You have exceeded your ${feature} limit. Please upgrade to increase your limit.`,
          code: 'usage-limit-exceeded',
          feature,
          limit,
        });
      }

      // Increment usage
      await opts.usageService.increment(userId, feature);
    }
  };
}
