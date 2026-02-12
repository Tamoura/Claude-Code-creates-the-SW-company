import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../../plugins/crypto';
import { signToken } from '../../plugins/auth';

class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const { email, password } = parsed.data;

    const existingUser = await fastify.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await fastify.prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const token = signToken({ userId: user.id });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const { email, password } = parsed.data;

    const user = await fastify.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({ userId: user.id });

    return reply.status(200).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  // Error handler for AppError
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    // Let Fastify handle other errors
    reply.status(500).send({ error: 'Internal server error' });
  });
};

export default authRoutes;
