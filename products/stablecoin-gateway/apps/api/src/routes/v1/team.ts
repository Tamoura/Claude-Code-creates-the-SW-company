/**
 * Team Management API Routes
 *
 * Provides organization and team member management:
 * - Create and list organizations
 * - Add, update, and remove members
 * - Leave an organization
 *
 * Security:
 * - All endpoints require JWT authentication
 * - Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
 */

import { FastifyPluginAsync } from 'fastify';
import { ZodError, z } from 'zod';
import { TeamService } from '../../services/team.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

// Validation schemas
const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
});

const addMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

const teamRoutes: FastifyPluginAsync = async (fastify) => {
  const teamService = new TeamService(fastify.prisma);

  // POST /v1/team/organizations - Create organization
  fastify.post(
    '/organizations',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const body = createOrgSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const org = await teamService.createOrganization(userId, body.name);

        logger.info('Organization created', {
          userId,
          orgId: org.id,
          name: org.name,
        });

        return reply.code(201).send({
          id: org.id,
          name: org.name,
          created_at: org.createdAt.toISOString(),
          updated_at: org.updatedAt.toISOString(),
          members: org.members.map(formatMember),
        });
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  // GET /v1/team/organizations - List user's organizations
  fastify.get(
    '/organizations',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;

        const memberships = await teamService.listUserOrganizations(userId);

        return reply.send({
          data: memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            role: m.role,
            joined_at: m.createdAt.toISOString(),
            created_at: m.organization.createdAt.toISOString(),
            updated_at: m.organization.updatedAt.toISOString(),
          })),
        });
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  // GET /v1/team/organizations/:orgId - Get org details
  fastify.get(
    '/organizations/:orgId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params as { orgId: string };
        const userId = request.currentUser!.id;

        const org = await teamService.getOrganization(orgId, userId);

        return reply.send({
          id: org.id,
          name: org.name,
          created_at: org.createdAt.toISOString(),
          updated_at: org.updatedAt.toISOString(),
          members: org.members.map(formatMember),
        });
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  // POST /v1/team/organizations/:orgId/members - Add member
  fastify.post(
    '/organizations/:orgId/members',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params as { orgId: string };
        const body = addMemberSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const member = await teamService.addMember(
          orgId,
          body.email,
          body.role as any,
          userId
        );

        logger.info('Team member added', {
          orgId,
          memberId: member.id,
          email: body.email,
          role: body.role,
          invitedBy: userId,
        });

        return reply.code(201).send(formatMember(member));
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  // PATCH /v1/team/organizations/:orgId/members/:memberId - Update role
  fastify.patch(
    '/organizations/:orgId/members/:memberId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { orgId, memberId } = request.params as {
          orgId: string;
          memberId: string;
        };
        const body = updateRoleSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const member = await teamService.updateMemberRole(
          orgId,
          memberId,
          body.role as any,
          userId
        );

        logger.info('Team member role updated', {
          orgId,
          memberId,
          newRole: body.role,
          updatedBy: userId,
        });

        return reply.send(formatMember(member));
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  // DELETE /v1/team/organizations/:orgId/members/:memberId - Remove member
  fastify.delete(
    '/organizations/:orgId/members/:memberId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { orgId, memberId } = request.params as {
          orgId: string;
          memberId: string;
        };
        const userId = request.currentUser!.id;

        await teamService.removeMember(orgId, memberId, userId);

        logger.info('Team member removed', {
          orgId,
          memberId,
          removedBy: userId,
        });

        return reply.code(204).send();
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  // DELETE /v1/team/organizations/:orgId/leave - Leave organization
  fastify.delete(
    '/organizations/:orgId/leave',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params as { orgId: string };
        const userId = request.currentUser!.id;

        await teamService.leaveOrganization(orgId, userId);

        logger.info('User left organization', {
          orgId,
          userId,
        });

        return reply.code(204).send();
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );
};

// ==================== Helper Functions ====================

function formatMember(member: {
  id: string;
  role: string;
  invitedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string };
}) {
  return {
    id: member.id,
    user_id: member.user.id,
    email: member.user.email,
    role: member.role,
    invited_by: member.invitedBy,
    joined_at: member.createdAt.toISOString(),
    updated_at: member.updatedAt.toISOString(),
  };
}

function handleError(error: unknown, reply: any) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send(error.toJSON());
  }
  if (error instanceof ZodError) {
    return reply.code(400).send({
      type: 'https://gateway.io/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: error.message,
    });
  }
  logger.error('Team route error', error);
  throw error;
}

export default teamRoutes;
