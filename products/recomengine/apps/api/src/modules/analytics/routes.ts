import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError } from '../../utils/errors';
import { subDays, format, parseISO } from 'date-fns';

function getDateRange(query: Record<string, string>): { from: Date; to: Date } {
  if (query.from && query.to) {
    return { from: parseISO(query.from), to: parseISO(query.to) };
  }
  const days = query.period === '7d' ? 7 : query.period === '90d' ? 90 : 30;
  return { from: subDays(new Date(), days), to: new Date() };
}

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /tenants/:tenantId/analytics/overview
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/analytics/overview', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const { from, to } = getDateRange(request.query as Record<string, string>);

    const analytics = await fastify.prisma.analyticsDaily.aggregate({
      where: {
        tenantId: request.params.tenantId,
        date: { gte: from, lte: to },
      },
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true,
      },
    });

    const impressions = analytics._sum.impressions || 0;
    const clicks = analytics._sum.clicks || 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 10000 : 0;

    return {
      data: {
        impressions,
        clicks,
        ctr,
        conversions: analytics._sum.conversions || 0,
        revenue: Number(analytics._sum.revenue || 0),
        period: { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') },
      },
    };
  });

  // GET /tenants/:tenantId/analytics/timeseries
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/analytics/timeseries', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const { from, to } = getDateRange(request.query as Record<string, string>);

    const dailyData = await fastify.prisma.analyticsDaily.groupBy({
      by: ['date'],
      where: {
        tenantId: request.params.tenantId,
        date: { gte: from, lte: to },
      },
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true,
      },
      orderBy: { date: 'asc' },
    });

    return {
      data: dailyData.map(d => ({
        date: format(d.date, 'yyyy-MM-dd'),
        impressions: d._sum.impressions || 0,
        clicks: d._sum.clicks || 0,
        conversions: d._sum.conversions || 0,
        revenue: Number(d._sum.revenue || 0),
      })),
    };
  });

  // GET /tenants/:tenantId/analytics/top-products
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/analytics/top-products', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const limit = Math.min(parseInt(query.limit || '10', 10), 50);
    const { from } = getDateRange(query);

    // Get top products from events
    const events = await fastify.prisma.event.groupBy({
      by: ['productId'],
      where: {
        tenantId: request.params.tenantId,
        eventType: { in: ['recommendation_clicked', 'recommendation_impressed'] },
        timestamp: { gte: from },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Enrich with catalog data
    const productIds = events.map(e => e.productId);
    const catalogItems = await fastify.prisma.catalogItem.findMany({
      where: { tenantId: request.params.tenantId, productId: { in: productIds } },
    });
    const catalogMap = new Map(catalogItems.map(i => [i.productId, i]));

    const data = events.map(e => {
      const catalog = catalogMap.get(e.productId);
      return {
        productId: e.productId,
        productName: catalog?.name || 'Unknown',
        imageUrl: catalog?.imageUrl,
        clicks: e._count.id,
        impressions: 0,
        ctr: 0,
        conversions: 0,
        revenue: 0,
      };
    });

    return { data };
  });

  // GET /tenants/:tenantId/analytics/export
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/analytics/export', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const { from, to } = getDateRange(request.query as Record<string, string>);

    const dailyData = await fastify.prisma.analyticsDaily.findMany({
      where: {
        tenantId: request.params.tenantId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });

    const csvHeader = 'date,impressions,clicks,conversions,revenue,placement_id,strategy\n';
    const csvRows = dailyData.map(d =>
      `${format(d.date, 'yyyy-MM-dd')},${d.impressions},${d.clicks},${d.conversions},${d.revenue},${d.placementId || ''},${d.strategy || ''}`
    ).join('\n');

    const filename = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return csvHeader + csvRows;
  });
}
