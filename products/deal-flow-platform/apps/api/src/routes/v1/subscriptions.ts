import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../../types/index';
import { verifyToken, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../lib/audit';
import { validate } from '../../lib/validate';

const createSubscriptionSchema = z.object({
  dealId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('QAR'),
  acceptedTerms: z.boolean(),
  acceptedRisks: z.boolean(),
});

export default async function subscriptionRoutes(fastify: FastifyInstance) {

  // POST / -- create subscription intent (investor only)
  fastify.post('/', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(createSubscriptionSchema, request.body);
    const user = request.currentUser!;

    if (!body.acceptedTerms || !body.acceptedRisks) {
      throw new AppError(400, 'TERMS_NOT_ACCEPTED', 'Must accept terms and risks');
    }

    // Get investor profile
    const investorProfile = await fastify.prisma.investorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!investorProfile) {
      throw new AppError(400, 'NO_INVESTOR_PROFILE', 'Investor profile not found');
    }

    // Get deal
    const deal = await fastify.prisma.deal.findUnique({
      where: { id: body.dealId },
    });

    if (!deal) {
      throw new AppError(404, 'DEAL_NOT_FOUND', 'Deal not found');
    }

    // Check deal is open for subscriptions
    if (deal.status !== 'SUBSCRIPTION_OPEN') {
      throw new AppError(
        400,
        'DEAL_NOT_OPEN',
        'Deal is not currently open for subscriptions'
      );
    }

    // Check eligibility
    const eligible = deal.eligibleClassifications as string[];
    if (!eligible.includes(investorProfile.classification)) {
      throw new AppError(
        403,
        'INELIGIBLE_CLASSIFICATION',
        `Your classification (${investorProfile.classification}) is not eligible for this deal`
      );
    }

    // Check minimum investment
    if (deal.minInvestment && body.amount < Number(deal.minInvestment)) {
      throw new AppError(
        400,
        'BELOW_MINIMUM',
        `Minimum investment is ${deal.minInvestment} ${deal.currency}`
      );
    }

    // Check maximum investment
    if (deal.maxInvestment && body.amount > Number(deal.maxInvestment)) {
      throw new AppError(
        400,
        'ABOVE_MAXIMUM',
        `Maximum investment is ${deal.maxInvestment} ${deal.currency}`
      );
    }

    const subscription = await fastify.prisma.subscription.create({
      data: {
        investorId: investorProfile.id,
        dealId: body.dealId,
        amount: body.amount,
        currency: body.currency,
        status: 'INTENT_EXPRESSED',
        acceptedTerms: body.acceptedTerms,
        acceptedRisks: body.acceptedRisks,
      },
    });

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      action: 'CREATE',
      resource: 'Subscription',
      resourceId: subscription.id,
      after: {
        dealId: body.dealId,
        amount: body.amount,
        status: 'INTENT_EXPRESSED',
      },
    });

    return reply.code(201).send({ data: subscription });
  });

  // GET / -- list user's subscriptions
  fastify.get('/', {
    preHandler: [verifyToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser!;
    const query = request.query as Record<string, string>;
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const cursor = query.cursor;

    const investorProfile = await fastify.prisma.investorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!investorProfile) {
      return reply.send({ data: [], meta: { total: 0, limit } });
    }

    const where = { investorId: investorProfile.id };
    const total = await fastify.prisma.subscription.count({ where });

    const cursorClause = cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {};

    const subscriptions = await fastify.prisma.subscription.findMany({
      where,
      take: limit,
      ...cursorClause,
      orderBy: { createdAt: 'desc' },
      include: { deal: { select: { titleEn: true, dealType: true, status: true } } },
    });

    const nextCursor = subscriptions.length === limit
      ? subscriptions[subscriptions.length - 1].id
      : null;

    return reply.send({
      data: subscriptions,
      meta: { total, limit, nextCursor },
    });
  });

  // GET /:id -- subscription detail
  fastify.get('/:id', {
    preHandler: [verifyToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.currentUser!;

    const investorProfile = await fastify.prisma.investorProfile.findUnique({
      where: { userId: user.id },
    });

    const subscription = await fastify.prisma.subscription.findFirst({
      where: { id, investorId: investorProfile?.id },
      include: { deal: true },
    });

    if (!subscription) {
      throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    return reply.send({ data: subscription });
  });
}
