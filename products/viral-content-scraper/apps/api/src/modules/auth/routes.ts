import { FastifyInstance } from 'fastify';
import { validateBody, signupSchema, loginSchema } from '../../utils/validation';
import { UnauthorizedError, ConflictError } from '../../utils/errors';
import * as crypto from 'crypto';

// Simple password hashing using Node.js crypto (avoids native dependency issues)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === derived;
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/signup
  fastify.post('/signup', async (request, reply) => {
    const { email, password, name } = validateBody(signupSchema, request.body);

    const existing = await fastify.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = hashPassword(password);
    const user = await fastify.prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = fastify.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    return reply.status(201).send({ token, user });
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = validateBody(loginSchema, request.body);

    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = fastify.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  // GET /api/v1/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return reply.send({ user });
  });
}
