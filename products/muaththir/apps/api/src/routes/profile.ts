import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../utils/crypto';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../lib/errors';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100)
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/profile - Get current parent's profile
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;

    const childCount = await fastify.prisma.child.count({
      where: { parentId: parent.id },
    });

    return reply.code(200).send({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      subscriptionTier: parent.subscriptionTier,
      createdAt: parent.createdAt.toISOString(),
      childCount,
    });
  });

  // PUT /api/profile - Update name and/or email
  fastify.put('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const updates = validateBody(updateProfileSchema, request.body);

    const data: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      data.name = updates.name;
    }

    if (updates.email !== undefined) {
      // Check for duplicate email
      const existing = await fastify.prisma.parent.findUnique({
        where: { email: updates.email },
      });
      if (existing && existing.id !== parent.id) {
        throw new ConflictError('Email already in use');
      }
      data.email = updates.email;
    }

    const updated = await fastify.prisma.parent.update({
      where: { id: parent.id },
      data,
    });

    return reply.code(200).send({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      subscriptionTier: updated.subscriptionTier,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  // PUT /api/profile/password - Change password
  fastify.put('/password', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { currentPassword, newPassword } = validateBody(
      changePasswordSchema,
      request.body
    );

    const valid = await verifyPassword(currentPassword, parent.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);

    await fastify.prisma.parent.update({
      where: { id: parent.id },
      data: { passwordHash },
    });

    return reply.code(200).send({
      message: 'Password updated successfully',
    });
  });
};

export default profileRoutes;
