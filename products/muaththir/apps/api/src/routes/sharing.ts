import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../lib/errors';

const SHARE_ROLES = ['viewer', 'contributor'] as const;

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(SHARE_ROLES).optional().default('viewer'),
  childIds: z.array(z.string()).optional(),
});

const updateShareSchema = z.object({
  role: z.enum(SHARE_ROLES).optional(),
  childIds: z.array(z.string()).optional(),
});

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
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

function formatShare(share: {
  id: string;
  parentId: string;
  inviteeEmail: string;
  inviteeId: string | null;
  role: string;
  status: string;
  childIds: string[];
  invitedAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: share.id,
    parentId: share.parentId,
    inviteeEmail: share.inviteeEmail,
    inviteeId: share.inviteeId,
    role: share.role,
    status: share.status,
    childIds: share.childIds,
    invitedAt: share.invitedAt.toISOString(),
    respondedAt: share.respondedAt
      ? share.respondedAt.toISOString()
      : null,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  };
}

const sharingRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/sharing/invite — Invite a family member
  fastify.post('/invite', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { email, role, childIds } = validateBody(inviteSchema, request.body);

    // Prevent self-invite
    if (email.toLowerCase() === parent.email.toLowerCase()) {
      throw new BadRequestError('You cannot invite yourself');
    }

    // If childIds provided, verify they belong to this parent
    let resolvedChildIds: string[] = [];
    if (childIds && childIds.length > 0) {
      const ownedChildren = await fastify.prisma.child.findMany({
        where: { parentId: parent.id, id: { in: childIds } },
        select: { id: true },
      });
      if (ownedChildren.length !== childIds.length) {
        throw new NotFoundError('One or more children not found');
      }
      resolvedChildIds = childIds;
    } else {
      // Share ALL children
      const allChildren = await fastify.prisma.child.findMany({
        where: { parentId: parent.id },
        select: { id: true },
      });
      resolvedChildIds = allChildren.map((c) => c.id);
    }

    // Check for existing invite
    const existing = await fastify.prisma.familyAccess.findUnique({
      where: {
        parentId_inviteeEmail: {
          parentId: parent.id,
          inviteeEmail: email.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictError('An invitation already exists for this email');
    }

    // Check if invitee already has an account
    const invitee = await fastify.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    const share = await fastify.prisma.familyAccess.create({
      data: {
        parentId: parent.id,
        inviteeEmail: email.toLowerCase(),
        inviteeId: invitee?.id ?? null,
        role,
        childIds: resolvedChildIds,
      },
    });

    return reply.code(201).send(formatShare(share));
  });

  // GET /api/sharing — List all shares for the current user
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;

    const shares = await fastify.prisma.familyAccess.findMany({
      where: { parentId: parent.id },
      orderBy: { createdAt: 'desc' },
    });

    return reply.code(200).send(shares.map(formatShare));
  });

  // PATCH /api/sharing/:id — Update a share
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { id } = request.params as { id: string };

    const share = await fastify.prisma.familyAccess.findUnique({
      where: { id },
    });

    if (!share) {
      throw new NotFoundError('Share not found');
    }

    if (share.parentId !== parent.id) {
      throw new ForbiddenError('You can only update your own shares');
    }

    const updates = validateBody(updateShareSchema, request.body);

    const data: Record<string, unknown> = {};
    if (updates.role !== undefined) {
      data.role = updates.role;
    }
    if (updates.childIds !== undefined) {
      // Verify childIds belong to this parent
      if (updates.childIds.length > 0) {
        const ownedChildren = await fastify.prisma.child.findMany({
          where: { parentId: parent.id, id: { in: updates.childIds } },
          select: { id: true },
        });
        if (ownedChildren.length !== updates.childIds.length) {
          throw new NotFoundError('One or more children not found');
        }
      }
      data.childIds = updates.childIds;
    }

    const updated = await fastify.prisma.familyAccess.update({
      where: { id },
      data,
    });

    return reply.code(200).send(formatShare(updated));
  });

  // DELETE /api/sharing/:id — Revoke a share
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { id } = request.params as { id: string };

    const share = await fastify.prisma.familyAccess.findUnique({
      where: { id },
    });

    if (!share) {
      throw new NotFoundError('Share not found');
    }

    if (share.parentId !== parent.id) {
      throw new ForbiddenError('You can only revoke your own shares');
    }

    await fastify.prisma.familyAccess.delete({
      where: { id },
    });

    return reply.code(204).send();
  });

  // GET /api/sharing/shared-with-me — List shares where current user is invitee
  fastify.get('/shared-with-me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;

    const shares = await fastify.prisma.familyAccess.findMany({
      where: {
        OR: [
          { inviteeEmail: parent.email.toLowerCase() },
          { inviteeId: parent.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.code(200).send(shares.map(formatShare));
  });

  // POST /api/sharing/:id/respond — Accept or decline an invitation
  fastify.post('/:id/respond', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { id } = request.params as { id: string };
    const { action } = validateBody(respondSchema, request.body);

    const share = await fastify.prisma.familyAccess.findUnique({
      where: { id },
    });

    if (!share) {
      throw new NotFoundError('Share not found');
    }

    // Only the invitee can respond
    const isInvitee =
      share.inviteeEmail.toLowerCase() === parent.email.toLowerCase() ||
      share.inviteeId === parent.id;

    if (!isInvitee) {
      throw new ForbiddenError('Only the invitee can respond to this invitation');
    }

    if (share.status !== 'pending') {
      throw new BadRequestError('This invitation has already been responded to');
    }

    const updated = await fastify.prisma.familyAccess.update({
      where: { id },
      data: {
        status: action === 'accept' ? 'accepted' : 'declined',
        respondedAt: new Date(),
        inviteeId: parent.id,
      },
    });

    return reply.code(200).send(formatShare(updated));
  });
};

export default sharingRoutes;
