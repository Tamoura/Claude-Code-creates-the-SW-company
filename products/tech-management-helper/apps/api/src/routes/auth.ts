import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  organizationId: z.string().uuid('Invalid organization ID'),
});

type RegisterBody = z.infer<typeof registerSchema>;

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/register
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        // Validate request body
        const validationResult = registerSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: validationResult.error.errors[0].message,
            details: validationResult.error.errors,
          });
        }

        const { email, password, name, organizationId } = validationResult.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'User with this email already exists',
          });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            organizationId,
            role: 'VIEWER', // Default role
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Generate JWT token
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return reply.status(201).send({
          token,
          user,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to register user',
        });
      }
    }
  );
}
