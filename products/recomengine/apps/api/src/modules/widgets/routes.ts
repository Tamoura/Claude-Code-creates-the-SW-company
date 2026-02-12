import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateBody, createWidgetConfigSchema, updateWidgetConfigSchema } from '../../utils/validation';
import { NotFoundError, ConflictError } from '../../utils/errors';

export default async function widgetRoutes(fastify: FastifyInstance) {
  // GET /tenants/:tenantId/widgets
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/widgets', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const widgets = await fastify.prisma.widgetConfig.findMany({
      where: { tenantId: request.params.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: widgets };
  });

  // POST /tenants/:tenantId/widgets
  fastify.post<{ Params: { tenantId: string } }>('/:tenantId/widgets', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = validateBody(createWidgetConfigSchema, request.body);

    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const existing = await fastify.prisma.widgetConfig.findUnique({
      where: {
        tenantId_placementId: {
          tenantId: request.params.tenantId,
          placementId: data.placementId,
        },
      },
    });
    if (existing) {
      throw new ConflictError(`Widget config already exists for placement '${data.placementId}'`);
    }

    const widget = await fastify.prisma.widgetConfig.create({
      data: {
        tenantId: request.params.tenantId,
        placementId: data.placementId,
        layout: data.layout,
        columns: data.columns,
        theme: data.theme || undefined,
        maxItems: data.maxItems,
        showPrice: data.showPrice,
        ctaText: data.ctaText,
      },
    });

    return reply.status(201).send({ data: widget });
  });

  // GET /tenants/:tenantId/widgets/:widgetId
  fastify.get<{ Params: { tenantId: string; widgetId: string } }>('/:tenantId/widgets/:widgetId', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const widget = await fastify.prisma.widgetConfig.findFirst({
      where: { id: request.params.widgetId, tenantId: request.params.tenantId },
    });
    if (!widget) throw new NotFoundError('Widget config not found');

    return { data: widget };
  });

  // PUT /tenants/:tenantId/widgets/:widgetId
  fastify.put<{ Params: { tenantId: string; widgetId: string } }>('/:tenantId/widgets/:widgetId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = validateBody(updateWidgetConfigSchema, request.body);

    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const widget = await fastify.prisma.widgetConfig.findFirst({
      where: { id: request.params.widgetId, tenantId: request.params.tenantId },
    });
    if (!widget) throw new NotFoundError('Widget config not found');

    const updated = await fastify.prisma.widgetConfig.update({
      where: { id: request.params.widgetId },
      data,
    });

    return { data: updated };
  });

  // DELETE /tenants/:tenantId/widgets/:widgetId
  fastify.delete<{ Params: { tenantId: string; widgetId: string } }>('/:tenantId/widgets/:widgetId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const widget = await fastify.prisma.widgetConfig.findFirst({
      where: { id: request.params.widgetId, tenantId: request.params.tenantId },
    });
    if (!widget) throw new NotFoundError('Widget config not found');

    await fastify.prisma.widgetConfig.delete({
      where: { id: request.params.widgetId },
    });

    return { data: { message: 'Widget config deleted' } };
  });
}
