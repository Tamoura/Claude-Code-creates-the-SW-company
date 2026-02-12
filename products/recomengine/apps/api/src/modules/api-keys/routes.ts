import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../../utils/crypto';
import { validateBody, createApiKeySchema } from '../../utils/validation';
import { NotFoundError, ConflictError } from '../../utils/errors';

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  // GET /tenants/:tenantId/api-keys
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/api-keys', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID '${request.params.tenantId}' not found`);
    }

    const keys = await fastify.prisma.apiKey.findMany({
      where: { tenantId: request.params.tenantId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        tenantId: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: keys };
  });

  // POST /tenants/:tenantId/api-keys
  fastify.post<{ Params: { tenantId: string } }>('/:tenantId/api-keys', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { name, permissions } = validateBody(createApiKeySchema, request.body);

    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID '${request.params.tenantId}' not found`);
    }

    // Check max keys limit
    const config = tenant.config as { maxApiKeys?: number };
    const maxKeys = config.maxApiKeys || 10;
    const activeKeys = await fastify.prisma.apiKey.count({
      where: { tenantId: request.params.tenantId, revokedAt: null },
    });
    if (activeKeys >= maxKeys) {
      throw new ConflictError(`Maximum API keys (${maxKeys}) reached for this tenant`);
    }

    const rawKey = generateApiKey('live');
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);

    const apiKey = await fastify.prisma.apiKey.create({
      data: {
        tenantId: request.params.tenantId,
        name,
        keyHash,
        keyPrefix,
        permissions,
      },
    });

    return reply.status(201).send({
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Shown only once
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        tenantId: apiKey.tenantId,
        createdAt: apiKey.createdAt,
      },
    });
  });

  // DELETE /tenants/:tenantId/api-keys/:keyId
  fastify.delete<{ Params: { tenantId: string; keyId: string } }>('/:tenantId/api-keys/:keyId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID '${request.params.tenantId}' not found`);
    }

    const key = await fastify.prisma.apiKey.findFirst({
      where: { id: request.params.keyId, tenantId: request.params.tenantId, revokedAt: null },
    });
    if (!key) {
      throw new NotFoundError('API key not found');
    }

    await fastify.prisma.apiKey.update({
      where: { id: request.params.keyId },
      data: { revokedAt: new Date() },
    });

    return { data: { message: 'API key revoked' } };
  });
}
