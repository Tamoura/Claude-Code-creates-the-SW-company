import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'ANALYST', 'VIEWER']),
});

type UpdateRoleBody = z.infer<typeof updateRoleSchema>;

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/users - List all users (Admin only)
  fastify.get(
    '/',
    {
      preHandler: [authenticate, authorize('manage', 'User')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const users = await prisma.user.findMany({
        where: { organizationId: request.user!.organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.status(200).send({ users });
    }
  );

  // PATCH /api/v1/users/:id/role - Update user role (Admin only)
  fastify.patch<{ Params: { id: string }; Body: UpdateRoleBody }>(
    '/:id/role',
    {
      preHandler: [authenticate, authorize('manage', 'User')],
    },
    async (request, reply) => {
      const validationResult = updateRoleSchema.safeParse(request.body);

      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: validationResult.error.errors[0].message,
        });
      }

      const { id } = request.params;
      const { role } = validationResult.data;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user || user.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.status(200).send({ user: updatedUser });
    }
  );
}
