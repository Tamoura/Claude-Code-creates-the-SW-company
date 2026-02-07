import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema } from './schemas.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError, ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { logger } from '../../utils/logger.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Stricter rate limits for auth endpoints.
  // In test mode, use higher limits to avoid interfering
  // with test suites that call register/login in beforeEach.
  const isTest = process.env.NODE_ENV === 'test';
  const authRateLimit = {
    config: {
      rateLimit: {
        max: isTest ? 100 : 10,
        timeWindow: 60000,
      },
    },
  };

  /**
   * POST /api/v1/auth/register
   * Register a new user account.
   */
  fastify.post('/register', authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({
        type: 'https://pulse.dev/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Request validation failed',
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existing = await fastify.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hashPassword(password);

    const user = await fastify.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    const token = fastify.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      { expiresIn: '1h' }
    );

    logger.info('User registered', { userId: user.id, email: user.email });

    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubUsername: user.githubUsername,
        avatarUrl: user.avatarUrl,
        githubConnected: !!user.githubToken,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  /**
   * POST /api/v1/auth/login
   * Login with email and password.
   */
  fastify.post('/login', authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({
        type: 'https://pulse.dev/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Request validation failed',
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { email, password } = parsed.data;

    const user = await fastify.prisma.user.findUnique({
      where: { email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = fastify.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      { expiresIn: '1h' }
    );

    logger.info('User logged in', { userId: user.id, email: user.email });

    return reply.code(200).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubUsername: user.githubUsername,
        avatarUrl: user.avatarUrl,
        githubConnected: !!user.githubToken,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  /**
   * GET /api/v1/auth/github
   * Initiate GitHub OAuth flow. Stub for foundation.
   */
  fastify.get('/github', async (_request, reply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return reply.code(500).send({
        type: 'https://pulse.dev/errors/configuration-error',
        title: 'Configuration Error',
        status: 500,
        detail: 'GitHub OAuth is not configured',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3106';
    const redirectUri = `${frontendUrl}/api/v1/auth/github/callback`;
    const scope = 'repo read:org read:user';
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

    return reply.redirect(githubUrl);
  });

  /**
   * GET /api/v1/auth/github/callback
   * GitHub OAuth callback. Stub for foundation.
   */
  fastify.get('/github/callback', async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.code(400).send({
        type: 'https://pulse.dev/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'Missing authorization code',
      });
    }

    // TODO: Exchange code for token, create/update user
    // When storing the GitHub OAuth token, encrypt it before saving:
    //
    //   import { encryptToken } from '../../utils/encryption.js';
    //   const encryptedToken = encryptToken(githubAccessToken);
    //   await fastify.prisma.user.update({
    //     where: { id: userId },
    //     data: { githubToken: encryptedToken },
    //   });
    //
    return reply.code(200).send({
      message: 'GitHub OAuth callback received',
      code: 'received',
    });
  });
};

export default authRoutes;
