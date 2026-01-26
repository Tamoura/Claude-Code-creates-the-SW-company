import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateToken } from '../lib/jwt.js';
import { registerSchema, RegisterBody, loginSchema, LoginBody } from '../schemas/auth.schema.js';

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

  // POST /api/v1/auth/login
  fastify.post<{ Body: LoginBody }>(
    '/login',
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      try {
        // Validate request body
        const validationResult = loginSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: validationResult.error.errors[0].message,
            details: validationResult.error.errors,
          });
        }

        const { email, password } = validationResult.data;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid credentials',
          });
        }

        // Check if user is active
        if (!user.isActive) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Account has been deactivated',
          });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.passwordHash);

        if (!isValidPassword) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid credentials',
          });
        }

        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        });

        // Create session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        await prisma.session.create({
          data: {
            token,
            userId: user.id,
            expiresAt,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
          },
        });

        // Return user without password hash
        const { passwordHash: _, ...userWithoutPassword } = user;

        return reply.status(200).send({
          token,
          user: userWithoutPassword,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to login',
        });
      }
    }
  );
}
