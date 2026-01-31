import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index';
import { verifyToken, requireRole } from '../../middleware/auth';
import { resolveTenant } from '../../middleware/tenant';
import { createAuditLog } from '../../lib/audit';
import { validate } from '../../lib/validate';

const createDealSchema = z.object({
  titleEn: z.string().min(1),
  titleAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  dealType: z.enum([
    'IPO', 'MUTUAL_FUND', 'SUKUK', 'PE_VC',
    'PRIVATE_PLACEMENT', 'REAL_ESTATE', 'SAVINGS',
  ]),
  targetRaise: z.number().positive().optional(),
  minInvestment: z.number().positive().optional(),
  maxInvestment: z.number().positive().optional(),
  currency: z.string().default('QAR'),
  shariaCompliance: z.enum(['CERTIFIED', 'NON_CERTIFIED', 'PENDING']).default('PENDING'),
  purificationRatio: z.number().min(0).max(1).optional(),
  sector: z.string().optional(),
  eligibleClassifications: z.array(z.string()).optional(),
  dealMetadata: z.record(z.unknown()).optional(),
  subscriptionOpenDate: z.string().datetime().optional(),
  subscriptionCloseDate: z.string().datetime().optional(),
});

const updateDealSchema = z.object({
  titleEn: z.string().min(1).optional(),
  titleAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  targetRaise: z.number().positive().optional(),
  minInvestment: z.number().positive().optional(),
  maxInvestment: z.number().positive().optional(),
  shariaCompliance: z.enum(['CERTIFIED', 'NON_CERTIFIED', 'PENDING']).optional(),
  sector: z.string().optional(),
  eligibleClassifications: z.array(z.string()).optional(),
  dealMetadata: z.record(z.unknown()).optional(),
});

const statusTransitionSchema = z.object({
  status: z.enum([
    'DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'SUBSCRIPTION_OPEN',
    'SUBSCRIPTION_CLOSED', 'ALLOCATION', 'SETTLED', 'CANCELLED',
  ]),
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ACTIVE', 'DRAFT', 'CANCELLED'],
  ACTIVE: ['SUBSCRIPTION_OPEN', 'CANCELLED'],
  SUBSCRIPTION_OPEN: ['SUBSCRIPTION_CLOSED', 'CANCELLED'],
  SUBSCRIPTION_CLOSED: ['ALLOCATION', 'CANCELLED'],
  ALLOCATION: ['SETTLED', 'CANCELLED'],
  SETTLED: [],
  CANCELLED: [],
};

export default async function dealRoutes(fastify: FastifyInstance) {

  // GET / -- list/search deals (public, but tenant-scoped)
  fastify.get('/', {
    preHandler: [resolveTenant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const cursor = query.cursor;

    const where: Record<string, unknown> = {
      tenantId: request.tenantId,
      deletedAt: null,
    };

    if (query.dealType) where.dealType = query.dealType;
    if (query.status) where.status = query.status;
    if (query.sector) where.sector = query.sector;
    if (query.shariaCompliance) where.shariaCompliance = query.shariaCompliance;

    if (query.search) {
      where.titleEn = { contains: query.search, mode: 'insensitive' };
    }

    const total = await fastify.prisma.deal.count({ where: where as any });

    const cursorClause = cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {};

    const deals = await fastify.prisma.deal.findMany({
      where: where as any,
      take: limit,
      ...cursorClause,
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });

    const nextCursor = deals.length === limit
      ? deals[deals.length - 1].id
      : null;

    return reply.send({
      data: deals,
      meta: { total, limit, nextCursor },
    });
  });

  // GET /:id -- deal detail
  fastify.get('/:id', {
    preHandler: [resolveTenant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const deal = await fastify.prisma.deal.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
      include: {
        documents: true,
        issuer: { include: { user: { select: { fullNameEn: true } } } },
      },
    });

    if (!deal) {
      throw new AppError(404, 'DEAL_NOT_FOUND', 'Deal not found');
    }

    return reply.send({ data: deal });
  });

  // POST / -- create deal (issuer only)
  fastify.post('/', {
    preHandler: [verifyToken, requireRole('ISSUER')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(createDealSchema, request.body);
    const user = request.currentUser!;

    const issuerProfile = await fastify.prisma.issuerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!issuerProfile) {
      throw new AppError(400, 'NO_ISSUER_PROFILE', 'Issuer profile not found');
    }

    const deal = await fastify.prisma.deal.create({
      data: {
        tenantId: user.tenantId,
        issuerId: issuerProfile.id,
        titleEn: body.titleEn,
        titleAr: body.titleAr,
        descriptionEn: body.descriptionEn,
        descriptionAr: body.descriptionAr,
        dealType: body.dealType,
        targetRaise: body.targetRaise,
        minInvestment: body.minInvestment,
        maxInvestment: body.maxInvestment,
        currency: body.currency,
        shariaCompliance: body.shariaCompliance,
        purificationRatio: body.purificationRatio,
        sector: body.sector,
        eligibleClassifications: body.eligibleClassifications || ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: body.dealMetadata || {},
        subscriptionOpenDate: body.subscriptionOpenDate ? new Date(body.subscriptionOpenDate) : undefined,
        subscriptionCloseDate: body.subscriptionCloseDate ? new Date(body.subscriptionCloseDate) : undefined,
        status: 'DRAFT',
      },
    });

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      action: 'CREATE',
      resource: 'Deal',
      resourceId: deal.id,
      after: { titleEn: deal.titleEn, dealType: deal.dealType },
    });

    return reply.code(201).send({ data: deal });
  });

  // PATCH /:id -- update deal (owner only)
  fastify.patch('/:id', {
    preHandler: [verifyToken, requireRole('ISSUER')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = validate(updateDealSchema, request.body);
    const user = request.currentUser!;

    const issuerProfile = await fastify.prisma.issuerProfile.findUnique({
      where: { userId: user.id },
    });

    const deal = await fastify.prisma.deal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!deal) {
      throw new AppError(404, 'DEAL_NOT_FOUND', 'Deal not found');
    }

    if (deal.issuerId !== issuerProfile?.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update your own deals');
    }

    const before = { ...deal };
    const updated = await fastify.prisma.deal.update({
      where: { id },
      data: body as any,
    });

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      action: 'UPDATE',
      resource: 'Deal',
      resourceId: id,
      before,
      after: updated,
    });

    return reply.send({ data: updated });
  });

  // PATCH /:id/status -- transition deal status
  fastify.patch('/:id/status', {
    preHandler: [verifyToken, requireRole('ISSUER')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = validate(statusTransitionSchema, request.body);
    const user = request.currentUser!;

    const issuerProfile = await fastify.prisma.issuerProfile.findUnique({
      where: { userId: user.id },
    });

    const deal = await fastify.prisma.deal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!deal) {
      throw new AppError(404, 'DEAL_NOT_FOUND', 'Deal not found');
    }

    if (deal.issuerId !== issuerProfile?.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update your own deals');
    }

    const allowed = VALID_TRANSITIONS[deal.status] || [];
    if (!allowed.includes(body.status)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition from ${deal.status} to ${body.status}`
      );
    }

    const updated = await fastify.prisma.deal.update({
      where: { id },
      data: { status: body.status },
    });

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      action: 'STATUS_CHANGE',
      resource: 'Deal',
      resourceId: id,
      before: { status: deal.status },
      after: { status: updated.status },
    });

    return reply.send({ data: updated });
  });
}
