import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateBody, validateQuery, createTenantSchema, updateTenantSchema, paginationQuerySchema } from '../../utils/validation';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { parsePagination, paginatedResult } from '../../utils/pagination';

export default async function tenantRoutes(fastify: FastifyInstance) {
  // GET /tenants
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const { limit, offset } = parsePagination(query);
    const statusFilter = query.status as string | undefined;

    const where: Record<string, unknown> = { ownerId: request.user!.id };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const [tenants, total] = await Promise.all([
      fastify.prisma.tenant.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.tenant.count({ where }),
    ]);

    return paginatedResult(tenants, total, { limit, offset });
  });

  // POST /tenants
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = validateBody(createTenantSchema, request.body);

    const tenant = await fastify.prisma.tenant.create({
      data: {
        name: data.name,
        config: data.config || undefined,
        ownerId: request.user!.id,
      },
    });

    return reply.status(201).send({ data: tenant });
  });

  // GET /tenants/:tenantId
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant with ID '${request.params.tenantId}' not found`);
    }

    return { data: tenant };
  });

  // PUT /tenants/:tenantId
  fastify.put<{ Params: { tenantId: string } }>('/:tenantId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = validateBody(updateTenantSchema, request.body);

    const existing = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });

    if (!existing) {
      throw new NotFoundError(`Tenant with ID '${request.params.tenantId}' not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.config !== undefined) {
      updateData.config = { ...(existing.config as object), ...data.config };
    }

    const tenant = await fastify.prisma.tenant.update({
      where: { id: request.params.tenantId },
      data: updateData,
    });

    return { data: tenant };
  });

  // DELETE /tenants/:tenantId
  fastify.delete<{ Params: { tenantId: string } }>('/:tenantId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const existing = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });

    if (!existing) {
      throw new NotFoundError(`Tenant with ID '${request.params.tenantId}' not found`);
    }

    // Soft delete + revoke all API keys
    await fastify.prisma.$transaction([
      fastify.prisma.tenant.update({
        where: { id: request.params.tenantId },
        data: { status: 'deleted' },
      }),
      fastify.prisma.apiKey.updateMany({
        where: { tenantId: request.params.tenantId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { data: { message: 'Tenant deleted. Data will be retained for 30 days.' } };
  });
}
