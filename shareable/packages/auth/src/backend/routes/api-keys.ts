import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { generateApiKey, hashApiKey, logger } from '@connectsw/shared';
import { AppError } from '../types.js';
import { validateBody } from '../validation.js';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.record(z.boolean()).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface ApiKeyRoutesOptions {
  /** Default permissions for new API keys */
  defaultPermissions?: Record<string, boolean>;
  /** API key prefix. Default: 'sk_live' */
  keyPrefix?: 'sk_live' | 'sk_test';
}

const apiKeyRoutes: FastifyPluginAsync<ApiKeyRoutesOptions> = async (fastify, opts) => {
  const {
    defaultPermissions = { read: true, write: true },
    keyPrefix = 'sk_live',
  } = opts;

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api-keys
  fastify.get('/', async (request, reply) => {
    const userId = request.currentUser.id;
    const { page, limit } = listQuerySchema.parse(request.query);
    const skip = (page - 1) * limit;

    const [keys, total] = await Promise.all([
      fastify.prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
      fastify.prisma.apiKey.count({ where: { userId } }),
    ]);

    return reply.send({
      data: keys.map((k: any) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.keyPrefix,
        permissions: k.permissions,
        last_used_at: k.lastUsedAt?.toISOString() ?? null,
        created_at: k.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

  // POST /api-keys
  fastify.post('/', async (request, reply) => {
    try {
      const userId = request.currentUser.id;
      const body = validateBody(createApiKeySchema, request.body);

      const rawKey = generateApiKey(keyPrefix);
      const keyHash = hashApiKey(rawKey);
      const keyPrefixValue = rawKey.substring(0, 16) + '...';

      const apiKey = await fastify.prisma.apiKey.create({
        data: {
          userId,
          name: body.name,
          keyHash,
          keyPrefix: keyPrefixValue,
          permissions: body.permissions ?? defaultPermissions,
        },
      });

      logger.info('API key created', { userId, apiKeyId: apiKey.id, name: body.name });

      return reply.code(201).send({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,
        key_prefix: keyPrefixValue,
        permissions: apiKey.permissions,
        created_at: apiKey.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // DELETE /api-keys/:id
  fastify.delete('/:id', async (request, reply) => {
    try {
      const userId = request.currentUser.id;
      const { id } = request.params as { id: string };

      const result = await fastify.prisma.apiKey.deleteMany({
        where: { id, userId },
      });

      if (result.count === 0) {
        throw new AppError(404, 'not-found', 'API key not found');
      }

      logger.info('API key deleted', { userId, apiKeyId: id });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      throw error;
    }
  });
};

export default apiKeyRoutes;
