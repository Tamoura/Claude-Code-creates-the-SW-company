import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword, generateToken } from '../utils/crypto';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '../utils/errors';

// Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['TALENT', 'EMPLOYER', 'ADMIN']).optional().default('TALENT'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/register
  fastify.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: parsed.error.issues,
        },
      });
    }
    const body = parsed.data;

    // Check if user exists
    const existingUser = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create user
    const user = await fastify.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name || null,
        role: body.role,
      },
    });

    // Create email verification token
    const token = generateToken();
    await fastify.prisma.emailVerification.create({
      data: {
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return reply.code(201).send({
      message: 'Registration successful. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: parsed.error.issues,
        },
      });
    }
    const body = parsed.data;

    // Find user
    const user = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check email verified
    if (!user.emailVerified) {
      throw new UnauthorizedError('Please verify your email before logging in');
    }

    // Create tokens
    const accessToken = fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = generateToken(64);

    // Create session
    await fastify.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: parsed.error.issues,
        },
      });
    }
    const body = parsed.data;

    // Find session
    const session = await fastify.prisma.session.findUnique({
      where: { refreshToken: body.refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await fastify.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Delete old session (one-time use)
    await fastify.prisma.session.delete({ where: { id: session.id } });

    // Create new tokens
    const accessToken = fastify.jwt.sign(
      {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      { expiresIn: '15m' }
    );

    const newRefreshToken = generateToken(64);

    // Create new session
    await fastify.prisma.session.create({
      data: {
        userId: session.user.id,
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return reply.send({
      accessToken,
      refreshToken: newRefreshToken,
    });
  });

  // DELETE /auth/logout
  fastify.delete('/auth/logout', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      // Delete all sessions for user
      await fastify.prisma.session.deleteMany({
        where: { userId: request.currentUser!.id },
      });

      return reply.send({ message: 'Logged out successfully' });
    },
  });

  // POST /auth/verify-email
  fastify.post('/auth/verify-email', async (request, reply) => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: parsed.error.issues,
        },
      });
    }
    const body = parsed.data;

    // Find verification token
    const verification = await fastify.prisma.emailVerification.findUnique({
      where: { token: body.token },
    });

    if (!verification) {
      throw new BadRequestError('Invalid verification token');
    }

    // Check expiration
    if (verification.expiresAt < new Date()) {
      throw new BadRequestError('Verification token expired');
    }

    // Update user
    await fastify.prisma.user.update({
      where: { email: verification.email },
      data: { emailVerified: true },
    });

    // Delete verification token
    await fastify.prisma.emailVerification.delete({
      where: { token: body.token },
    });

    return reply.send({ message: 'Email verified successfully' });
  });

  // POST /auth/forgot-password
  fastify.post('/auth/forgot-password', async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: parsed.error.issues,
        },
      });
    }
    const body = parsed.data;

    // Check if user exists (but don't reveal if they don't)
    const user = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (user) {
      // Create password reset token
      const token = generateToken();
      await fastify.prisma.passwordReset.create({
        data: {
          email: body.email,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });
    }

    // Always return success to prevent email enumeration
    return reply.send({
      message: 'If the email exists, a password reset link has been sent',
    });
  });

  // POST /auth/reset-password
  fastify.post('/auth/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: parsed.error.issues,
        },
      });
    }
    const body = parsed.data;

    // Find reset token
    const reset = await fastify.prisma.passwordReset.findUnique({
      where: { token: body.token },
    });

    if (!reset) {
      throw new BadRequestError('Invalid reset token');
    }

    // Check if already used
    if (reset.used) {
      throw new BadRequestError('Reset token already used');
    }

    // Check expiration
    if (reset.expiresAt < new Date()) {
      throw new BadRequestError('Reset token expired');
    }

    // Hash new password
    const passwordHash = await hashPassword(body.newPassword);

    // Update user password
    await fastify.prisma.user.update({
      where: { email: reset.email },
      data: { passwordHash },
    });

    // Mark token as used
    await fastify.prisma.passwordReset.update({
      where: { token: body.token },
      data: { used: true },
    });

    return reply.send({ message: 'Password reset successfully' });
  });
};

export default authRoutes;
