import { FastifyPluginAsync } from 'fastify';
import { OrganizationService } from './organization.service';
import { sendSuccess } from '../../lib/response';

const organizationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new OrganizationService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── GET /api/v1/organizations ──────────────────────────────
  fastify.get('/', {
    schema: {
      description: 'List organizations',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.listOrganizations(request.user.sub);
    return sendSuccess(reply, data);
  });

  // ─── POST /api/v1/organizations ─────────────────────────────
  fastify.post('/', {
    schema: {
      description: 'Create a new organization',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          industry: { type: 'string' },
          website: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.createOrganization(
      request.user.sub,
      request.body as any
    );
    return sendSuccess(reply, data, 201);
  });

  // ─── GET /api/v1/organizations/:id ──────────────────────────
  fastify.get<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Get organization details',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.getOrganization(request.params.id);
    return sendSuccess(reply, data);
  });

  // ─── PATCH /api/v1/organizations/:id ────────────────────────
  fastify.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Update organization details',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: { type: 'string' },
          industry: { type: 'string' },
          size: { type: 'string' },
          headquarters: { type: 'string' },
          website: { type: 'string' },
          foundedYear: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.updateOrganization(
      request.params.id,
      request.user.sub,
      request.body as any
    );
    return sendSuccess(reply, data);
  });

  // ─── POST /api/v1/organizations/:id/follow ───────────────────
  fastify.post<{ Params: { id: string } }>('/:id/follow', {
    schema: {
      description: 'Follow an organization',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    await service.followOrganization(
      request.params.id,
      request.user.sub
    );
    return sendSuccess(reply, { followed: true }, 201);
  });

  // ─── DELETE /api/v1/organizations/:id/follow ─────────────────
  fastify.delete<{ Params: { id: string } }>('/:id/follow', {
    schema: {
      description: 'Unfollow an organization',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    await service.unfollowOrganization(
      request.params.id,
      request.user.sub
    );
    return sendSuccess(reply, { followed: false });
  });

  // ─── GET /api/v1/organizations/:id/followers ─────────────────
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>('/:id/followers', {
    schema: {
      description: 'List followers of an organization',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const limit = parseInt(request.query.limit ?? '20', 10);
    const offset = parseInt(request.query.offset ?? '0', 10);
    const data = await service.listFollowers(
      request.params.id,
      limit,
      offset
    );
    return sendSuccess(reply, data);
  });

  // ─── POST /api/v1/organizations/:id/members ──────────────────
  fastify.post<{ Params: { id: string } }>('/:id/members', {
    schema: {
      description: 'Add a member to an organization (admin only)',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { userId, role } = request.body as {
      userId: string;
      role: string;
    };
    const data = await service.addMember(
      request.params.id,
      request.user.sub,
      userId,
      role
    );
    return sendSuccess(reply, data, 201);
  });

  // ─── DELETE /api/v1/organizations/:id/members/:userId ────────
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    {
      schema: {
        description: 'Remove a member from an organization',
        tags: ['Organizations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await service.removeMember(
        request.params.id,
        request.user.sub,
        request.params.userId
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── GET /api/v1/organizations/:id/members ───────────────────
  fastify.get<{ Params: { id: string } }>('/:id/members', {
    schema: {
      description: 'List members of an organization',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.listMembers(request.params.id);
    return sendSuccess(reply, data);
  });

  // ─── GET /api/v1/organizations/:id/jobs ──────────────────────
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>('/:id/jobs', {
    schema: {
      description: 'List jobs posted by an organization',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const limit = parseInt(request.query.limit ?? '20', 10);
    const offset = parseInt(request.query.offset ?? '0', 10);
    const data = await service.listOrganizationJobs(
      request.params.id,
      limit,
      offset
    );
    return sendSuccess(reply, data);
  });
};

export default organizationRoutes;
