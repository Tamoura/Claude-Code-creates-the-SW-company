import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword, generateRefreshToken } from '../utils/crypto';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';

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

const REFRESH_TOKEN_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7',
  10
);

function parentToResponse(parent: { id: string; email: string; name: string; subscriptionTier: string; createdAt: Date }) {
  return {
    id: parent.id,
    email: parent.email,
    name: parent.name,
    subscriptionTier: parent.subscriptionTier,
    createdAt: parent.createdAt.toISOString(),
  };
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /register
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || 'Validation failed',
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { name, email, password } = parsed.data;

    // Check for duplicate email
    const existing = await fastify.prisma.parent.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create parent
    const parent = await fastify.prisma.parent.create({
      data: { name, email, passwordHash },
    });

    // Generate tokens
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

    // Set refresh token as HttpOnly cookie
    reply.setCookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    });

    return reply.code(201).send({
      user: parentToResponse(parent),
      accessToken,
    });
  });

  // POST /login
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || 'Validation failed',
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { email, password } = parsed.data;

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

    // Generate tokens
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

    return reply.code(200).send({
      user: parentToResponse(parent),
      accessToken,
    });
  });

  // POST /logout (requires auth)
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      await fastify.prisma.session.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Also delete all sessions for this user if no specific token
    if (!refreshToken && request.currentUser) {
      await fastify.prisma.session.deleteMany({
        where: { parentId: request.currentUser.id },
      });
    }

    reply.clearCookie('refreshToken', {
      path: '/api/auth',
    });

    return reply.code(200).send({ message: 'Logged out successfully' });
  });

  // POST /refresh
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    // Find session
    const session = await fastify.prisma.session.findUnique({
      where: { token: refreshToken },
      include: { parent: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check expiry
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

    // Create new session
    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await fastify.prisma.session.create({
      data: {
        parentId: session.parentId,
        token: newRefreshToken,
        expiresAt,
      },
    });

    // Generate new access token
    const accessToken = fastify.jwt.sign(
      {
        sub: session.parent.id,
        email: session.parent.email,
        tier: session.parent.subscriptionTier,
      },
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    });

    return reply.code(200).send({
      accessToken,
    });
  });
};

export default authRoutes;
