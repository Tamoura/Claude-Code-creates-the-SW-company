import { FastifyPluginAsync } from 'fastify';
import { signupSchema, loginSchema, validateBody } from '../../utils/validation.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/auth/signup
  fastify.post('/signup', async (request, reply) => {
    try {
      const body = validateBody(signupSchema, request.body);

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        throw new AppError(409, 'user-exists', 'User with this email already exists');
      }

      // Hash password and create user
      const passwordHash = await hashPassword(body.password);
      const user = await fastify.prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
        },
      });

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { userId: user.id },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      logger.info('User signed up', { userId: user.id, email: user.email });

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        created_at: user.createdAt.toISOString(),
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      throw error;
    }
  });

  // POST /v1/auth/login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = validateBody(loginSchema, request.body);

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { userId: user.id },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      logger.info('User logged in', { userId: user.id, email: user.email });

      return reply.send({
        id: user.id,
        email: user.email,
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      throw error;
    }
  });

  // POST /v1/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refresh_token } = request.body as { refresh_token: string };

      if (!refresh_token) {
        throw new AppError(400, 'missing-token', 'Refresh token is required');
      }

      // Verify refresh token
      const decoded = fastify.jwt.verify(refresh_token) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new AppError(401, 'invalid-token', 'Invalid refresh token');
      }

      // Generate new access token
      const accessToken = fastify.jwt.sign(
        { userId: decoded.userId },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const newRefreshToken = fastify.jwt.sign(
        { userId: decoded.userId, type: 'refresh' },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      return reply.send({
        access_token: accessToken,
        refresh_token: newRefreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      throw new AppError(401, 'invalid-token', 'Invalid or expired refresh token');
    }
  });
};

export default authRoutes;
