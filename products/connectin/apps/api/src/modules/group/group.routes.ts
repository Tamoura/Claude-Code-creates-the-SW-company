import { FastifyPluginAsync } from 'fastify';
import { GroupService } from './group.service';
import { sendSuccess } from '../../lib/response';

const groupRoutes: FastifyPluginAsync = async (fastify) => {
  const groupService = new GroupService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/groups
  fastify.get('/', {
    schema: {
      description: 'List all groups',
      tags: ['Groups'],
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
  }, async (_request, reply) => {
    const data = await groupService.listGroups();
    return sendSuccess(reply, data);
  });

  // POST /api/v1/groups
  fastify.post('/', {
    schema: {
      description: 'Create a new group',
      tags: ['Groups'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          privacy: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
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
    const body = request.body as {
      name: string;
      description?: string;
      privacy?: string;
    };
    const data = await groupService.createGroup(request.user.sub, body);
    return sendSuccess(reply, data, 201);
  });

  // POST /api/v1/groups/:id/join
  fastify.post<{ Params: { id: string } }>('/:id/join', {
    schema: {
      description: 'Join a group',
      tags: ['Groups'],
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
    const data = await groupService.joinGroup(
      request.params.id,
      request.user.sub
    );
    return sendSuccess(reply, data, 201);
  });

  // DELETE /api/v1/groups/:id/join
  fastify.delete<{ Params: { id: string } }>('/:id/join', {
    schema: {
      description: 'Leave a group',
      tags: ['Groups'],
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
    await groupService.leaveGroup(request.params.id, request.user.sub);
    return sendSuccess(reply, { left: true });
  });

  // GET /api/v1/groups/:id/members
  fastify.get<{ Params: { id: string } }>('/:id/members', {
    schema: {
      description: 'List members of a group',
      tags: ['Groups'],
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
    const data = await groupService.listMembers(request.params.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/groups/:id/posts
  fastify.post<{ Params: { id: string } }>('/:id/posts', {
    schema: {
      description: 'Create a post in a group',
      tags: ['Groups'],
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
        required: ['content'],
        additionalProperties: false,
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 3000 },
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
    const body = request.body as { content: string };
    const data = await groupService.createPost(
      request.params.id,
      request.user.sub,
      body
    );
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/groups/:id/posts
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>('/:id/posts', {
    schema: {
      description: 'List posts in a group',
      tags: ['Groups'],
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
    const limit = Math.min(
      50,
      Math.max(1, parseInt(request.query.limit || '20', 10) || 20)
    );
    const offset = Math.max(
      0,
      parseInt(request.query.offset || '0', 10) || 0
    );
    const data = await groupService.listPosts(
      request.params.id,
      limit,
      offset
    );
    return sendSuccess(reply, data);
  });
};

export default groupRoutes;
