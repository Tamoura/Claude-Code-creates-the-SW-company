import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../services/auth.service';
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
} from '../validations/auth.validation';
import { sendSuccess, sendError } from '../lib/response';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  // ── POST /signup ─────────────────────────────────────
  fastify.post('/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      // Throw ZodError so the error-handler plugin formats it
      throw parsed.error;
    }

    const result = await authService.signup(parsed.data);

    return sendSuccess(
      reply,
      {
        user: result.user,
        message:
          'Account created. Please verify your email.',
      },
      201
    );
  });

  // ── POST /login ──────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const user = await authService.login(
      parsed.data.email,
      parsed.data.password
    );

    // Generate JTI for both access and refresh tokens
    const jti = crypto.randomUUID();

    // Sign JWT access token
    const accessToken = fastify.jwt.sign(
      { sub: user.id, role: user.role, jti }
    );

    // Create refresh token in DB
    const refreshExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ); // 7 days
    await authService.createRefreshToken(
      user.id,
      jti,
      refreshExpiresAt
    );

    // Set httpOnly cookie with the JTI
    reply.setCookie('refreshToken', jti, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return sendSuccess(reply, {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // ── POST /verify-email ──────────────────────────────
  fastify.post('/verify-email', async (request, reply) => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    await authService.verifyEmail(parsed.data.token);

    return sendSuccess(reply, {
      message: 'Email verified successfully',
    });
  });

  // ── POST /refresh ───────────────────────────────────
  fastify.post('/refresh', async (request, reply) => {
    const refreshJti =
      (request.cookies as Record<string, string | undefined>)
        ?.refreshToken;

    if (!refreshJti) {
      return sendError(
        reply,
        401,
        'UNAUTHORIZED',
        'No refresh token provided'
      );
    }

    const { user, newJti } =
      await authService.refreshToken(refreshJti);

    // Sign new access token
    const accessToken = fastify.jwt.sign(
      { sub: user.id, role: user.role, jti: newJti }
    );

    // Set new httpOnly cookie
    reply.setCookie('refreshToken', newJti, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return sendSuccess(reply, { accessToken });
  });

  // ── POST /logout ────────────────────────────────────
  fastify.post(
    '/logout',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.user as {
        jti?: string;
        sub?: string;
      };

      const refreshJti =
        (request.cookies as Record<string, string | undefined>)
          ?.refreshToken;

      await authService.logout(
        userPayload.jti,
        refreshJti,
        fastify.redis
      );

      // Clear the refresh cookie
      reply.setCookie('refreshToken', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });

      return sendSuccess(reply, {
        message: 'Logged out successfully',
      });
    }
  );
};

export default authRoutes;
