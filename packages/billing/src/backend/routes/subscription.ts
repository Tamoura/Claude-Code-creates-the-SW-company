/**
 * Subscription Management Routes
 *
 * CRUD for user subscriptions: get current plan, list plans,
 * change plan, cancel subscription, get usage.
 */

import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { SubscriptionService } from '../services/subscription.service.js';
import { UsageService } from '../services/usage.service.js';

const changePlanSchema = z.object({
  plan_id: z.string().min(1),
});

export interface SubscriptionRoutesOptions {
  subscriptionService: SubscriptionService;
  usageService?: UsageService;
}

const subscriptionRoutes: FastifyPluginAsync<SubscriptionRoutesOptions> = async (fastify, opts) => {
  const { subscriptionService, usageService } = opts;

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /subscription/plans
  fastify.get('/plans', async (_request, reply) => {
    const plans = subscriptionService.getPlans();
    return reply.send({ data: plans });
  });

  // GET /subscription
  fastify.get('/', async (request, reply) => {
    const sub = await subscriptionService.getSubscription(request.currentUser!.id);
    const plan = subscriptionService.getPlan(sub.planId);

    return reply.send({
      subscription: {
        plan_id: sub.planId,
        tier: sub.tier,
        status: sub.status,
        created_at: sub.createdAt?.toISOString(),
        changed_at: sub.changedAt?.toISOString(),
      },
      plan: plan ?? null,
    });
  });

  // POST /subscription/change
  fastify.post('/change', async (request, reply) => {
    try {
      const { plan_id } = changePlanSchema.parse(request.body);
      const updated = await subscriptionService.changePlan(request.currentUser!.id, plan_id);
      const plan = subscriptionService.getPlan(updated.planId);

      return reply.send({
        subscription: {
          plan_id: updated.planId,
          tier: updated.tier,
          status: updated.status,
        },
        plan: plan ?? null,
        message: 'Subscription updated successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      if (error instanceof Error && error.message.includes('Plan not found')) {
        return reply.code(404).send({ status: 404, detail: error.message });
      }
      throw error;
    }
  });

  // POST /subscription/cancel
  fastify.post('/cancel', async (request, reply) => {
    const updated = await subscriptionService.cancel(request.currentUser!.id);
    return reply.send({
      subscription: {
        plan_id: updated.planId,
        tier: updated.tier,
        status: updated.status,
      },
      message: 'Subscription cancelled. You have been moved to the free plan.',
    });
  });

  // GET /subscription/usage
  if (usageService) {
    fastify.get('/usage', async (request, reply) => {
      const usage = await usageService.getAllUsage(request.currentUser!.id);
      const sub = await subscriptionService.getSubscription(request.currentUser!.id);
      const plan = subscriptionService.getPlan(sub.planId);

      const limits: Record<string, number | string> = {};
      if (plan) {
        for (const [key, value] of Object.entries(plan.features)) {
          if (typeof value === 'number') limits[key] = value;
          else if (value === true) limits[key] = 'unlimited';
        }
      }

      return reply.send({ usage, limits });
    });
  }
};

export default subscriptionRoutes;
