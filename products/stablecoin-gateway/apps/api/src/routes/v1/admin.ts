import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { createKMSService, KMSService } from '../../services/kms.service.js';

const kmsRotateBodySchema = z.object({
  newKeyId: z.string().min(1, 'newKeyId is required'),
});

const merchantListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).max(10000).default(0), // RISK-072: bound offset
  search: z.string().max(255).optional().default(''),
});

const merchantPaymentsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).max(10000).default(0), // RISK-072: bound offset
  status: z.enum(['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
});

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes require authentication + admin role
  fastify.addHook('onRequest', async (request) => {
    await fastify.authenticate(request);
    await fastify.requireAdmin(request);
  });

  // Lazy KMS service singleton for admin operations.
  // Only created when USE_KMS is configured; absent in dev/test envs.
  let kmsService: KMSService | null = null;
  function getKmsService(): KMSService {
    if (!kmsService) {
      kmsService = createKMSService();
    }
    return kmsService;
  }

  // POST /v1/admin/kms/rotate — trigger KMS key rotation without downtime
  fastify.post('/kms/rotate', async (request, reply) => {
    try {
      const body = kmsRotateBodySchema.parse(request.body);
      const { newKeyId } = body;

      const svc = getKmsService();
      const oldKeyId = svc.getCurrentKeyId();
      svc.rotateKey(newKeyId);

      const health = await svc.healthCheck();
      if (health.status !== 'healthy') {
        // Attempt rollback to the previous key so the service stays operational
        try { svc.rotateKey(oldKeyId); } catch (_) {}
        logger.error('KMS key rotation health check failed', undefined, {
          newKeyId: newKeyId.substring(0, 8) + '...',
          healthMessage: health.message,
        });
        return reply.code(503).send({
          error: 'new-key-unhealthy',
          message: 'KMS key unhealthy after rotation, rolled back',
        });
      }

      logger.info('KMS key rotation completed', {
        newKeyId: newKeyId.substring(0, 8) + '...',
      });

      return reply.send({
        success: true,
        message: 'Key rotation initiated',
        keyId: newKeyId.substring(0, 8) + '...',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('KMS rotate endpoint error', error);
      throw error;
    }
  });

  // GET /v1/admin/merchants
  fastify.get('/merchants', async (request, reply) => {
    try {
      const query = merchantListQuerySchema.parse(request.query);
      const { limit: take, offset: skip, search } = query;

      const where: Prisma.UserWhereInput = search
        ? { email: { contains: search, mode: 'insensitive' as const } }
        : {};

      // Use database-level aggregation instead of loading all payment sessions
      // into memory. The previous approach fetched every paymentSession per
      // merchant which risks OOM at scale (Issue #1 from audit).
      const [merchants, total] = await Promise.all([
        fastify.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            _count: { select: { paymentSessions: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        fastify.prisma.user.count({ where }),
      ]);

      // Aggregate payment stats at the database level via groupBy
      const merchantIds = merchants.map((m) => m.id);
      const stats = merchantIds.length > 0
        ? await fastify.prisma.paymentSession.groupBy({
            by: ['userId', 'status'],
            where: { userId: { in: merchantIds } },
            _count: true,
            _sum: { amount: true },
          })
        : [];

      const statsMap = new Map<string, { statusSummary: Record<string, number>; totalVolume: number }>();
      for (const stat of stats) {
        if (!statsMap.has(stat.userId)) {
          statsMap.set(stat.userId, { statusSummary: {}, totalVolume: 0 });
        }
        const entry = statsMap.get(stat.userId)!;
        entry.statusSummary[stat.status] = stat._count;
        entry.totalVolume += Number(stat._sum.amount || 0);
      }

      const data = merchants.map((m) => {
        const merchantStats = statsMap.get(m.id);
        return {
          id: m.id,
          email: m.email,
          role: m.role,
          created_at: m.createdAt.toISOString(),
          payment_count: m._count.paymentSessions,
          total_volume: merchantStats?.totalVolume ?? 0,
          status_summary: merchantStats?.statusSummary ?? {},
        };
      });

      return reply.send({
        data,
        pagination: {
          total,
          limit: take,
          offset: skip,
          has_more: skip + take < total,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error listing merchants', error);
      throw error;
    }
  });

  // GET /v1/admin/merchants/:id/payments
  fastify.get('/merchants/:id/payments', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const query = merchantPaymentsQuerySchema.parse(request.query);
      const { limit: take, offset: skip, status } = query;

      // Verify merchant exists
      const merchant = await fastify.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (!merchant) {
        throw new AppError(404, 'not-found', 'Merchant not found');
      }

      const where: Prisma.PaymentSessionWhereInput = { userId: id };
      if (status) {
        where.status = status;
      }

      const [payments, total] = await Promise.all([
        fastify.prisma.paymentSession.findMany({
          where,
          select: {
            id: true,
            amount: true,
            currency: true,
            description: true,
            status: true,
            network: true,
            token: true,
            merchantAddress: true,
            customerAddress: true,
            txHash: true,
            createdAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        fastify.prisma.paymentSession.count({ where }),
      ]);

      const data = payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        description: p.description,
        status: p.status,
        network: p.network,
        token: p.token,
        merchant_address: p.merchantAddress,
        customer_address: p.customerAddress,
        tx_hash: p.txHash,
        created_at: p.createdAt.toISOString(),
        completed_at: p.completedAt?.toISOString() ?? null,
      }));

      return reply.send({
        data,
        pagination: {
          total,
          limit: take,
          offset: skip,
          has_more: skip + take < total,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error listing merchant payments', error);
      throw error;
    }
  });
};

export default adminRoutes;
