import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { AppError } from '../../types/index';
import { verifyToken } from '../../middleware/auth';
import { createAuditLog } from '../../lib/audit';
import { validate } from '../../lib/validate';
import { getConfig } from '../../config';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['INVESTOR', 'ISSUER']),
  tenantId: z.string().min(1),
  fullNameEn: z.string().optional(),
  fullNameAr: z.string().optional(),
  companyNameEn: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export default async function authRoutes(fastify: FastifyInstance) {

  // POST /register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(registerSchema, request.body);
    const config = getConfig();

    // Check for existing user
    const existing = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(body.password, config.BCRYPT_ROUNDS);

    const user = await fastify.prisma.user.create({
      data: {
        tenantId: body.tenantId,
        email: body.email,
        passwordHash,
        role: body.role,
        fullNameEn: body.fullNameEn,
        fullNameAr: body.fullNameAr,
      },
    });

    // Create profile based on role
    if (body.role === 'INVESTOR') {
      await fastify.prisma.investorProfile.create({
        data: { userId: user.id },
      });
    } else if (body.role === 'ISSUER') {
      await fastify.prisma.issuerProfile.create({
        data: {
          userId: user.id,
          companyNameEn: body.companyNameEn || 'Unnamed Company',
        },
      });
    }

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: body.tenantId,
      action: 'CREATE',
      resource: 'User',
      resourceId: user.id,
      after: { email: user.email, role: user.role },
    });

    return reply.code(201).send({
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullNameEn: user.fullNameEn,
        createdAt: user.createdAt,
      },
    });
  });

  // POST /login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(loginSchema, request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate access token
    const accessToken = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      { expiresIn: '15m' }
    );

    // Generate refresh token
    const rawRefreshToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawRefreshToken);

    await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user.id,
    });

    return reply.send({
      data: { accessToken, refreshToken: rawRefreshToken },
    });
  });

  // POST /refresh
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(refreshSchema, request.body);
    const tokenHash = hashToken(body.refreshToken);

    const storedToken = await fastify.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    // Revoke old token (rotation)
    await fastify.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    const user = storedToken.user;

    // Issue new tokens
    const accessToken = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      { expiresIn: '15m' }
    );

    const newRawRefreshToken = randomBytes(32).toString('hex');
    const newTokenHash = hashToken(newRawRefreshToken);

    await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send({
      data: { accessToken, refreshToken: newRawRefreshToken },
    });
  });

  // POST /logout
  fastify.post('/logout', {
    preHandler: [verifyToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(logoutSchema, request.body);
    const tokenHash = hashToken(body.refreshToken);

    await fastify.prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });

    return reply.send({ data: { message: 'Logged out successfully' } });
  });
}
