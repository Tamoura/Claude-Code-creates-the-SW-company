import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { generateToken } from '../lib/jwt.js';
import { registerSchema, RegisterBody } from '../schemas/auth.schema.js';

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
        const passwordHash = await hashPassword(password);

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
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        });

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
