import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import observabilityPlugin from '../../src/plugins/observability';
import screenRoutes from '../../src/routes/v1/screen';
import authRoutes from '../../src/routes/v1/auth';
import { AppError, ValidationError } from '../../src/lib/errors';

// Mock user for testing
const TEST_USER = {
  id: 'test-user-id',
  email: 'dev@test.com',
  passwordHash: 'hashed',
  role: 'DEVELOPER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock API key
const TEST_API_KEY = {
  id: 'test-key-id',
  userId: 'test-user-id',
  name: 'Test Key',
  keyHash: 'abc123',
  keyPrefix: 'ss_test_abc12345...',
  permissions: { read: true, write: false },
  lastUsedAt: null,
  createdAt: new Date(),
  user: TEST_USER,
};

/**
 * Build a test Fastify instance with mock auth.
 * No database required.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(jwt, {
    secret: 'test-jwt-secret-for-shariascreen',
  });

  await app.register(observabilityPlugin);

  // Mock prisma decorator
  app.decorate('prisma', {} as any);
  app.decorate('redis', null);

  // Mock auth - always authenticate as test user
  const mockAuthPlugin = fp(async (fastify: FastifyInstance) => {
    fastify.decorate('authenticate', async (request: any) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(
          'Missing authorization header',
          401,
          'UNAUTHORIZED'
        );
      }
      request.currentUser = TEST_USER;
      request.apiKey = TEST_API_KEY;
    });

    fastify.decorate('optionalAuth', async () => {});

    fastify.decorate(
      'requirePermission',
      (_permission: string) => {
        return async () => {};
      }
    );
  }, { name: 'auth' });

  await app.register(mockAuthPlugin);

  // Health check
  app.get('/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // Register routes
  await app.register(screenRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });

  // Error handler - Fastify auto-serializes errors with
  // statusCode property, so AppError works natively.
  // This handler ensures consistent format for all errors.
  app.setErrorHandler(async (error, _req, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  return app;
}

export { TEST_USER, TEST_API_KEY };
