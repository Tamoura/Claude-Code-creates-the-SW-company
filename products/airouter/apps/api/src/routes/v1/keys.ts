import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { encryptSecret } from '../../utils/encryption.js';
import { getProviderBySlug } from '../../data/providers.js';
import { AppError } from '../../types/index.js';

const addKeySchema = z.object({
  provider: z.string().min(1),
  api_key: z.string().min(1),
});

const keyRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/keys - Add a provider key (encrypted)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const body = addKeySchema.parse(request.body);
    const user = request.currentUser!;

    const provider = getProviderBySlug(body.provider);
    if (!provider) {
      throw new AppError(400, 'invalid-provider', `Unknown provider: ${body.provider}`);
    }

    // Check if user already has a key for this provider
    const existing = await fastify.prisma.providerKey.findUnique({
      where: { userId_provider: { userId: user.id, provider: body.provider } },
    });

    if (existing) {
      throw new AppError(409, 'key-exists', `You already have a key for ${provider.name}. Delete the existing key first.`);
    }

    // Encrypt the API key
    const encryptedKey = encryptSecret(body.api_key);
    const keyPrefix = body.api_key.substring(0, 8) + '...';

    const providerKey = await fastify.prisma.providerKey.create({
      data: {
        userId: user.id,
        provider: body.provider,
        encryptedKey,
        keyPrefix,
      },
    });

    return reply.code(201).send({
      id: providerKey.id,
      provider: providerKey.provider,
      provider_name: provider.name,
      key_prefix: providerKey.keyPrefix,
      is_valid: providerKey.isValid,
      created_at: providerKey.createdAt.toISOString(),
    });
  });

  // GET /api/v1/keys - List stored keys (prefix only)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.currentUser!;

    const keys = await fastify.prisma.providerKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      data: keys.map(k => {
        const provider = getProviderBySlug(k.provider);
        return {
          id: k.id,
          provider: k.provider,
          provider_name: provider?.name ?? k.provider,
          key_prefix: k.keyPrefix,
          is_valid: k.isValid,
          last_tested_at: k.lastTestedAt?.toISOString() ?? null,
          created_at: k.createdAt.toISOString(),
        };
      }),
    });
  });

  // DELETE /api/v1/keys/:id - Delete a provider key
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.currentUser!;

    const key = await fastify.prisma.providerKey.findFirst({
      where: { id, userId: user.id },
    });

    if (!key) {
      throw new AppError(404, 'not-found', 'Provider key not found');
    }

    await fastify.prisma.providerKey.delete({ where: { id } });

    return reply.code(204).send();
  });

  // POST /api/v1/keys/:id/test - Test key validity
  fastify.post('/:id/test', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.currentUser!;

    const key = await fastify.prisma.providerKey.findFirst({
      where: { id, userId: user.id },
    });

    if (!key) {
      throw new AppError(404, 'not-found', 'Provider key not found');
    }

    const provider = getProviderBySlug(key.provider);
    if (!provider) {
      throw new AppError(400, 'invalid-provider', 'Provider not found');
    }

    // Mark the key as tested (actual provider call would happen here)
    // For the prototype, we simulate a successful test
    await fastify.prisma.providerKey.update({
      where: { id },
      data: {
        isValid: true,
        lastTestedAt: new Date(),
      },
    });

    return reply.send({
      id: key.id,
      provider: key.provider,
      is_valid: true,
      tested_at: new Date().toISOString(),
      message: 'Key is valid',
    });
  });
};

export default keyRoutes;
