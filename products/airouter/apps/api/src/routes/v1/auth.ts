import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword, generateApiKey, hashApiKey, getApiKeyPrefix } from '../../utils/crypto.js';
import { AppError } from '../../types/index.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/signup
  fastify.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);

    const existing = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      throw new AppError(409, 'email-taken', 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(body.password);

    const user = await fastify.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
      },
    });

    const token = await reply.jwtSign(
      { userId: user.id },
      { expiresIn: '24h' }
    );

    return reply.code(201).send({
      id: user.id,
      email: user.email,
      access_token: token,
      created_at: user.createdAt.toISOString(),
    });
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
    }

    const token = await reply.jwtSign(
      { userId: user.id },
      { expiresIn: '24h' }
    );

    return reply.send({
      id: user.id,
      email: user.email,
      access_token: token,
    });
  });

  // POST /api/v1/auth/api-keys (create API key)
  fastify.post('/api-keys', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const body = createApiKeySchema.parse(request.body);
    const user = request.currentUser!;

    const rawKey = generateApiKey('air_live');
    const keyHash = hashApiKey(rawKey);
    const prefix = getApiKeyPrefix(rawKey);

    const apiKey = await fastify.prisma.apiKey.create({
      data: {
        userId: user.id,
        name: body.name,
        keyHash,
        prefix,
      },
    });

    return reply.code(201).send({
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Only returned on creation
      key_prefix: apiKey.prefix,
      created_at: apiKey.createdAt.toISOString(),
    });
  });

  // GET /api/v1/auth/api-keys
  fastify.get('/api-keys', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.currentUser!;

    const keys = await fastify.prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      data: keys.map(k => ({
        id: k.id,
        name: k.name,
        key_prefix: k.prefix,
        last_used_at: k.lastUsedAt?.toISOString() ?? null,
        created_at: k.createdAt.toISOString(),
      })),
    });
  });

  // DELETE /api/v1/auth/api-keys/:id
  fastify.delete('/api-keys/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.currentUser!;

    const apiKey = await fastify.prisma.apiKey.findFirst({
      where: { id, userId: user.id },
    });

    if (!apiKey) {
      throw new AppError(404, 'not-found', 'API key not found');
    }

    await fastify.prisma.apiKey.delete({ where: { id } });

    return reply.code(204).send();
  });
};

export default authRoutes;
