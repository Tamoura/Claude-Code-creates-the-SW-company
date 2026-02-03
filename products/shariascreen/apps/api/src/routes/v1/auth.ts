import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
} from '../../utils/crypto';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../lib/errors';

const signupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name required')
    .max(100, 'Name too long'),
  permissions: z
    .object({
      read: z.boolean().optional().default(true),
      write: z.boolean().optional().default(false),
    })
    .optional()
    .default({ read: true, write: false }),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Signup
  fastify.post('/auth/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0].message
      );
    }

    const { email, password } = parsed.data;

    const existing = await fastify.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictError(
        'An account with this email already exists'
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await fastify.prisma.user.create({
      data: { email, passwordHash },
    });

    const token = fastify.jwt.sign(
      { userId: user.id },
      { expiresIn: '24h' }
    );

    return reply.code(201).send({
      id: user.id,
      email: user.email,
      access_token: token,
    });
  });

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0].message
      );
    }

    const { email, password } = parsed.data;

    const user = await fastify.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await verifyPassword(
      password,
      user.passwordHash
    );
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = fastify.jwt.sign(
      { userId: user.id },
      { expiresIn: '24h' }
    );

    return reply.send({
      id: user.id,
      email: user.email,
      access_token: token,
    });
  });

  // Create API key
  fastify.post(
    '/auth/api-keys',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createApiKeySchema.safeParse(
        request.body
      );
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.errors[0].message
        );
      }

      const { name, permissions } = parsed.data;
      const rawKey = generateApiKey('ss_test');
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = getApiKeyPrefix(rawKey);

      const apiKey = await fastify.prisma.apiKey.create({
        data: {
          userId: request.currentUser!.id,
          name,
          keyHash,
          keyPrefix,
          permissions,
        },
      });

      return reply.code(201).send({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned once
        key_prefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        last_used_at: null,
        created_at: apiKey.createdAt.toISOString(),
      });
    }
  );

  // List API keys
  fastify.get(
    '/auth/api-keys',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const keys = await fastify.prisma.apiKey.findMany({
        where: { userId: request.currentUser!.id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        api_keys: keys.map((k) => ({
          id: k.id,
          name: k.name,
          key_prefix: k.keyPrefix,
          permissions: k.permissions,
          last_used_at: k.lastUsedAt?.toISOString() || null,
          created_at: k.createdAt.toISOString(),
        })),
      });
    }
  );

  // Delete API key
  fastify.delete<{ Params: { id: string } }>(
    '/auth/api-keys/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      const apiKey = await fastify.prisma.apiKey.findFirst({
        where: {
          id,
          userId: request.currentUser!.id,
        },
      });

      if (!apiKey) {
        throw new NotFoundError('API key not found');
      }

      await fastify.prisma.apiKey.delete({
        where: { id },
      });

      return reply.code(204).send();
    }
  );
};

export default authRoutes;
