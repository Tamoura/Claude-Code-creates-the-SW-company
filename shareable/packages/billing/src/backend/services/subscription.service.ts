/**
 * Subscription Service
 *
 * Manages user subscription tiers, plan changes, and feature access.
 * Designed to be extended with payment provider integration (Stripe, etc.).
 */

import { logger } from '@connectsw/shared';

export interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceAnnual: number;
  features: Record<string, boolean | number | string>;
}

export interface SubscriptionServiceOptions {
  /** Available plans. Must include at least a free plan. */
  plans: Plan[];
  /** Default tier for new users. Default: first plan's tier */
  defaultTier?: string;
}

export class SubscriptionService {
  private plans: Map<string, Plan>;
  private defaultTier: string;

  constructor(private prisma: any, opts: SubscriptionServiceOptions) {
    this.plans = new Map(opts.plans.map((p) => [p.id, p]));
    this.defaultTier = opts.defaultTier ?? opts.plans[0].tier;
  }

  /** Get all available plans. */
  getPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  /** Get a specific plan by ID. */
  getPlan(planId: string): Plan | undefined {
    return this.plans.get(planId);
  }

  /** Get the user's current subscription. */
  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });

    if (!sub) {
      // Auto-create free tier subscription
      return this.prisma.subscription.create({
        data: {
          userId,
          planId: this.getPlans()[0].id,
          tier: this.defaultTier,
          status: 'ACTIVE',
        },
      });
    }

    return sub;
  }

  /** Check if user has access to a specific feature. */
  async hasFeature(userId: string, featureKey: string): Promise<boolean> {
    const sub = await this.getSubscription(userId);
    const plan = this.plans.get(sub.planId);
    if (!plan) return false;

    const value = plan.features[featureKey];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return value !== undefined;
  }

  /** Get the feature limit for a user (e.g., max projects, max API calls). */
  async getFeatureLimit(userId: string, featureKey: string): Promise<number> {
    const sub = await this.getSubscription(userId);
    const plan = this.plans.get(sub.planId);
    if (!plan) return 0;

    const value = plan.features[featureKey];
    if (typeof value === 'number') return value;
    if (value === true) return Infinity;
    return 0;
  }

  /** Change a user's subscription plan. */
  async changePlan(userId: string, newPlanId: string) {
    const plan = this.plans.get(newPlanId);
    if (!plan) throw new Error(`Plan not found: ${newPlanId}`);

    const sub = await this.getSubscription(userId);

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        planId: newPlanId,
        tier: plan.tier,
        previousPlanId: sub.planId,
        changedAt: new Date(),
      },
    });

    logger.info('Subscription plan changed', { userId, from: sub.planId, to: newPlanId });
    return updated;
  }

  /** Cancel a user's subscription (revert to free tier). */
  async cancel(userId: string) {
    const freePlan = this.getPlans().find((p) => p.priceMonthly === 0);
    if (!freePlan) throw new Error('No free plan configured');

    const sub = await this.getSubscription(userId);

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        planId: freePlan.id,
        tier: freePlan.tier,
        status: 'CANCELLED',
        previousPlanId: sub.planId,
        cancelledAt: new Date(),
        changedAt: new Date(),
      },
    });

    logger.info('Subscription cancelled', { userId, previousPlan: sub.planId });
    return updated;
  }
}
