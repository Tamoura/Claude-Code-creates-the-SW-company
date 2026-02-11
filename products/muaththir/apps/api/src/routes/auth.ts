import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as crypto from 'crypto';
import { hashPassword, verifyPassword, generateRefreshToken } from '../utils/crypto';
import { BadRequestError, ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';
import { logger } from '../utils/logger';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

const REFRESH_TOKEN_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7',
  10
);

interface ParentLike {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  createdAt: Date;
}

function parentToResponse(parent: ParentLike) {
  return {
    id: parent.id,
    email: parent.email,
    name: parent.name,
    subscriptionTier: parent.subscriptionTier,
    createdAt: parent.createdAt.toISOString(),
  };
}

function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

async function issueTokens(
  fastify: FastifyInstance,
  reply: FastifyReply,
  parent: ParentLike
): Promise<string> {
  const accessToken = fastify.jwt.sign(
    { sub: parent.id, email: parent.email, tier: parent.subscriptionTier },
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshTokenValue = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await fastify.prisma.session.create({
    data: {
      parentId: parent.id,
      token: refreshTokenValue,
      expiresAt,
    },
  });

  reply.setCookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
  });

  return accessToken;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { name, email, password } = validateBody(
      registerSchema,
      request.body
    );

    try {
      const passwordHash = await hashPassword(password);
      const parent = await fastify.prisma.parent.create({
        data: { name, email, passwordHash },
      });

      const accessToken = await issueTokens(fastify, reply, parent);

      return reply.code(201).send({
        user: parentToResponse(parent),
        accessToken,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('Email already registered');
      }
      throw error;
    }
  });

  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { email, password } = validateBody(loginSchema, request.body);

    const parent = await fastify.prisma.parent.findUnique({
      where: { email },
    });

    if (!parent) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await verifyPassword(password, parent.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = await issueTokens(fastify, reply, parent);

    return reply.code(200).send({
      user: parentToResponse(parent),
      accessToken,
    });
  });

  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      await fastify.prisma.session.deleteMany({
        where: { token: refreshToken },
      });
    } else if (request.currentUser) {
      await fastify.prisma.session.deleteMany({
        where: { parentId: request.currentUser.id },
      });
    }

    reply.clearCookie('refreshToken', {
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return reply.code(200).send({ message: 'Logged out successfully' });
  });

  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    const session = await fastify.prisma.session.findUnique({
      where: { token: refreshToken },
      include: { parent: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      await fastify.prisma.session.delete({
        where: { id: session.id },
      });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Delete old session (rotation)
    await fastify.prisma.session.delete({
      where: { id: session.id },
    });

    const accessToken = await issueTokens(fastify, reply, session.parent);

    return reply.code(200).send({ accessToken });
  });

  fastify.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const { email } = validateBody(forgotPasswordSchema, request.body);

    const parent = await fastify.prisma.parent.findUnique({
      where: { email },
    });

    if (parent) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await fastify.prisma.parent.update({
        where: { id: parent.id },
        data: { resetToken, resetTokenExp },
      });

      logger.info('Password reset token generated', { email });
    }

    return reply.code(200).send({
      message: 'If an account exists, a reset link has been sent',
    });
  });

  fastify.post('/reset-password', async (request, reply) => {
    const { token, password } = validateBody(
      resetPasswordSchema,
      request.body
    );

    const parent = await fastify.prisma.parent.findFirst({
      where: { resetToken: token },
    });

    if (!parent) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (!parent.resetTokenExp || parent.resetTokenExp < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(password);

    await fastify.prisma.parent.update({
      where: { id: parent.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return reply.code(200).send({
      message: 'Password has been reset',
    });
  });
};

export default authRoutes;
