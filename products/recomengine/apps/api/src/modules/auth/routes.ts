import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hashPassword, verifyPassword, generateResetToken } from '../../utils/crypto';
import { validateBody } from '../../utils/validation';
import { signupSchema, loginSchema } from '../../utils/validation';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /signup
  fastify.post('/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = validateBody(signupSchema, request.body);

    const existing = await fastify.prisma.admin.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(password);
    const admin = await fastify.prisma.admin.create({
      data: { email, passwordHash },
    });

    const token = fastify.jwt.sign({ id: admin.id, email: admin.email, role: admin.role });

    return reply.status(201).send({
      data: {
        token,
        user: { id: admin.id, email: admin.email, role: admin.role },
      },
    });
  });

  // POST /login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = validateBody(loginSchema, request.body);

    const admin = await fastify.prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = fastify.jwt.sign({ id: admin.id, email: admin.email, role: admin.role });

    // Set refresh token cookie
    const refreshToken = fastify.jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      { expiresIn: '7d' }
    );

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      data: {
        token,
        user: { id: admin.id, email: admin.email, role: admin.role },
      },
    };
  });

  // POST /logout
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('refreshToken', { path: '/' });
    return { data: { message: 'Logged out successfully' } };
  });

  // POST /forgot-password
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email?: string };
    // Always return success to prevent user enumeration
    if (body?.email) {
      const admin = await fastify.prisma.admin.findUnique({ where: { email: body.email } });
      if (admin) {
        const resetToken = generateResetToken();
        logger.info('Password reset requested (token would be emailed)', {
          email: body.email,
          tokenPrefix: resetToken.substring(0, 8),
        });
        // In production, send email with reset link
      }
    }
    return {
      data: { message: 'If an account with that email exists, a reset link has been sent.' },
    };
  });

  // POST /reset-password
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { token?: string; password?: string };
    if (!body?.token || !body?.password) {
      throw new BadRequestError('Token and new password are required');
    }
    if (body.password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }
    // In production: validate token, find user, update password
    return { data: { message: 'Password has been reset successfully' } };
  });
}
