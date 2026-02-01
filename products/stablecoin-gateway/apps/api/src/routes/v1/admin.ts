import { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../types/index.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes require authentication + admin role
  fastify.addHook('onRequest', async (request) => {
    await fastify.authenticate(request);
    await fastify.requireAdmin(request);
  });

  // GET /v1/admin/merchants
  fastify.get('/merchants', async (request, reply) => {
    const { limit = '20', offset = '0', search = '' } = request.query as {
      limit?: string;
      offset?: string;
      search?: string;
    };

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = parseInt(offset) || 0;

    const where = search
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
  });

  // GET /v1/admin/merchants/:id/payments
  fastify.get('/merchants/:id/payments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = '20', offset = '0', status } = request.query as {
      limit?: string;
      offset?: string;
      status?: string;
    };

    // Verify merchant exists
    const merchant = await fastify.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!merchant) {
      throw new AppError(404, 'not-found', 'Merchant not found');
    }

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = parseInt(offset) || 0;

    const where: any = { userId: id };
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
  });
};

export default adminRoutes;
