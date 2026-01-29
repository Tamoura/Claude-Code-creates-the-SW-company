import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { createApiKeySchema, validateBody } from '../../utils/validation.js';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '../../utils/crypto.js';
import { AppError, ApiKeyResponse } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/api-keys - Create new API key
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = validateBody(createApiKeySchema, request.body);
      const userId = request.currentUser!.id;

      // Generate API key and hash for storage
      const apiKey = generateApiKey('sk_live');
      const keyHash = hashApiKey(apiKey);
      const keyPrefix = getApiKeyPrefix(apiKey);

      // Create API key in database
      const createdKey = await fastify.prisma.apiKey.create({
        data: {
          userId,
          name: body.name,
          keyHash,
          keyPrefix,
          permissions: body.permissions as any,
        },
      });

      logger.info('API key created', {
        userId,
        keyId: createdKey.id,
        name: body.name,
      });

      // Return key only on creation (never shown again)
      const response: ApiKeyResponse = {
        id: createdKey.id,
        name: createdKey.name,
        key: apiKey, // Only returned on creation
        key_prefix: createdKey.keyPrefix,
        permissions: createdKey.permissions as Record<string, boolean>,
        last_used_at: null,
        created_at: createdKey.createdAt.toISOString(),
      };

      return reply.code(201).send(response);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error creating API key', error);
      throw error;
    }
  });

  // GET /v1/api-keys - List user's API keys
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;

      const apiKeys = await fastify.prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const response = apiKeys.map((key): ApiKeyResponse => ({
        id: key.id,
        name: key.name,
        // Never return the full key after creation
        key_prefix: key.keyPrefix,
        permissions: key.permissions as Record<string, boolean>,
        last_used_at: key.lastUsedAt?.toISOString() || null,
        created_at: key.createdAt.toISOString(),
      }));

      return reply.send({ data: response });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error listing API keys', error);
      throw error;
    }
  });

  // GET /v1/api-keys/:id - Get specific API key
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      const apiKey = await fastify.prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!apiKey) {
        throw new AppError(404, 'api-key-not-found', 'API key not found');
      }

      const response: ApiKeyResponse = {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.keyPrefix,
        permissions: apiKey.permissions as Record<string, boolean>,
        last_used_at: apiKey.lastUsedAt?.toISOString() || null,
        created_at: apiKey.createdAt.toISOString(),
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error getting API key', error);
      throw error;
    }
  });

  // DELETE /v1/api-keys/:id - Revoke/delete API key
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      // Verify ownership before deletion
      const apiKey = await fastify.prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!apiKey) {
        throw new AppError(404, 'api-key-not-found', 'API key not found');
      }

      // Delete the API key
      await fastify.prisma.apiKey.delete({
        where: { id },
      });

      logger.info('API key deleted', {
        userId,
        keyId: id,
        name: apiKey.name,
      });

      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error deleting API key', error);
      throw error;
    }
  });
};

export default apiKeyRoutes;
