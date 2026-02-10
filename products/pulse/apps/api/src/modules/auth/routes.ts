import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema } from './schemas.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError, ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { encryptToken } from '../../utils/encryption.js';
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
   * Initiate GitHub OAuth flow.
   */
  fastify.get('/github', async (request, reply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || clientId === 'your_github_client_id') {
      return reply.code(500).send({
        type: 'https://pulse.dev/errors/configuration-error',
        title: 'Configuration Error',
        status: 500,
        detail: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID in .env',
      });
    }

    const port = process.env.PORT || '5003';
    const redirectUri = `http://localhost:${port}/api/v1/auth/github/callback`;
    const scope = 'repo read:org read:user';
    const state = crypto.randomUUID();
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    return reply.redirect(githubUrl);
  });

  /**
   * GET /api/v1/auth/github/callback
   * GitHub OAuth callback. Exchanges code for token, upserts user, redirects to frontend.
   */
  fastify.get('/github/callback', async (request, reply) => {
    const { code } = request.query as { code?: string };
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3106';

    if (!code) {
      return reply.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    try {
      // 1. Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });
      const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

      if (!tokenData.access_token) {
        logger.error('GitHub OAuth token exchange failed', { error: tokenData.error });
        return reply.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
      }

      const githubAccessToken = tokenData.access_token;

      // 2. Fetch GitHub user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });
      const ghUser = await userRes.json() as {
        login: string;
        email: string | null;
        name: string | null;
        avatar_url: string;
        id: number;
      };

      if (!ghUser.login) {
        return reply.redirect(`${frontendUrl}/login?error=github_profile_failed`);
      }

      // If GitHub doesn't return a public email, fetch from emails API
      let email = ghUser.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: 'application/vnd.github+json',
          },
        });
        const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email || null;
      }

      if (!email) {
        return reply.redirect(`${frontendUrl}/login?error=no_github_email`);
      }

      // 3. Encrypt the GitHub token before storage
      const encryptedGhToken = encryptToken(githubAccessToken);

      // 4. Upsert user: find by githubUsername or email, create if neither exists
      let user = await fastify.prisma.user.findFirst({
        where: {
          OR: [
            { githubUsername: ghUser.login },
            { email },
          ],
        },
      });

      if (user) {
        user = await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            githubUsername: ghUser.login,
            githubToken: encryptedGhToken,
            avatarUrl: ghUser.avatar_url,
            name: user.name || ghUser.name || ghUser.login,
          },
        });
        logger.info('GitHub OAuth login', { userId: user.id, github: ghUser.login });
      } else {
        user = await fastify.prisma.user.create({
          data: {
            email,
            name: ghUser.name || ghUser.login,
            githubUsername: ghUser.login,
            githubToken: encryptedGhToken,
            avatarUrl: ghUser.avatar_url,
          },
        });
        logger.info('GitHub OAuth signup', { userId: user.id, github: ghUser.login });
      }

      // 5. Generate JWT
      const jwt = fastify.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
        },
        { expiresIn: '1h' }
      );

      // 6. Redirect to frontend with token
      return reply.redirect(`${frontendUrl}/auth/callback?token=${jwt}`);
    } catch (err) {
      logger.error('GitHub OAuth error', { error: err });
      return reply.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  });
};

export default authRoutes;
