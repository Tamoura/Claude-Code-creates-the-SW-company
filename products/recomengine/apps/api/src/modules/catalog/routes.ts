import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateBody, createCatalogItemSchema, updateCatalogItemSchema, batchCatalogSchema } from '../../utils/validation';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { parsePagination, paginatedResult } from '../../utils/pagination';

export default async function catalogRoutes(fastify: FastifyInstance) {
  // GET /catalog
  fastify.get('/', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as Record<string, string>;
    const { limit, offset } = parsePagination(query);

    const where: Record<string, unknown> = { tenantId };
    if (query.category) where.category = query.category;
    if (query.available !== undefined) where.available = query.available === 'true';
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      fastify.prisma.catalogItem.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.catalogItem.count({ where }),
    ]);

    return paginatedResult(items, total, { limit, offset });
  });

  // POST /catalog
  fastify.post('/', {
    preHandler: [fastify.authenticateApiKey, fastify.requirePermission('read_write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const data = validateBody(createCatalogItemSchema, request.body);

    const existing = await fastify.prisma.catalogItem.findUnique({
      where: { tenantId_productId: { tenantId, productId: data.productId } },
    });
    if (existing) {
      throw new ConflictError(`Product '${data.productId}' already exists in catalog`);
    }

    const item = await fastify.prisma.catalogItem.create({
      data: {
        tenantId,
        productId: data.productId,
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price,
        imageUrl: data.imageUrl,
        attributes: data.attributes || {},
        available: data.available ?? true,
      },
    });

    return reply.status(201).send({ data: item });
  });

  // POST /catalog/batch
  fastify.post('/batch', {
    preHandler: [fastify.authenticateApiKey, fastify.requirePermission('read_write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const { items } = validateBody(batchCatalogSchema, request.body);

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const data = items[i];
        const existing = await fastify.prisma.catalogItem.findUnique({
          where: { tenantId_productId: { tenantId, productId: data.productId } },
        });

        if (existing) {
          await fastify.prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              description: data.description,
              category: data.category,
              price: data.price,
              imageUrl: data.imageUrl,
              attributes: data.attributes || existing.attributes,
              available: data.available ?? existing.available,
            },
          });
          updated++;
        } else {
          await fastify.prisma.catalogItem.create({
            data: {
              tenantId,
              productId: data.productId,
              name: data.name,
              description: data.description,
              category: data.category,
              price: data.price,
              imageUrl: data.imageUrl,
              attributes: data.attributes || {},
              available: data.available ?? true,
            },
          });
          created++;
        }
      } catch (err) {
        rejected++;
        errors.push({ index: i, message: (err as Error).message });
      }
    }

    return { data: { created, updated, rejected, errors } };
  });

  // GET /catalog/:productId
  fastify.get<{ Params: { productId: string } }>('/:productId', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request, reply) => {
    const tenantId = request.tenantId!;

    const item = await fastify.prisma.catalogItem.findUnique({
      where: { tenantId_productId: { tenantId, productId: request.params.productId } },
    });
    if (!item) {
      throw new NotFoundError(`Product '${request.params.productId}' not found`);
    }

    return { data: item };
  });

  // PUT /catalog/:productId
  fastify.put<{ Params: { productId: string } }>('/:productId', {
    preHandler: [fastify.authenticateApiKey, fastify.requirePermission('read_write')],
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const data = validateBody(updateCatalogItemSchema, request.body);

    const existing = await fastify.prisma.catalogItem.findUnique({
      where: { tenantId_productId: { tenantId, productId: request.params.productId } },
    });
    if (!existing) {
      throw new NotFoundError(`Product '${request.params.productId}' not found`);
    }

    const item = await fastify.prisma.catalogItem.update({
      where: { id: existing.id },
      data,
    });

    return { data: item };
  });

  // DELETE /catalog/:productId (soft delete — mark unavailable)
  fastify.delete<{ Params: { productId: string } }>('/:productId', {
    preHandler: [fastify.authenticateApiKey, fastify.requirePermission('read_write')],
  }, async (request, reply) => {
    const tenantId = request.tenantId!;

    const existing = await fastify.prisma.catalogItem.findUnique({
      where: { tenantId_productId: { tenantId, productId: request.params.productId } },
    });
    if (!existing) {
      throw new NotFoundError(`Product '${request.params.productId}' not found`);
    }

    await fastify.prisma.catalogItem.update({
      where: { id: existing.id },
      data: { available: false },
    });

    return { data: { message: 'Product marked as unavailable' } };
  });
}
