import { FastifyPluginAsync } from 'fastify';
import { EventService } from './event.service';
import { sendSuccess } from '../../lib/response';

const eventRoutes: FastifyPluginAsync = async (fastify) => {
  const eventService = new EventService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── GET /api/v1/events ────────────────────────────────────

  fastify.get(
    '/',
    {
      schema: {
        description: 'List all events ordered by start date',
        tags: ['Events'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const data = await eventService.listEvents();
      return sendSuccess(reply, data);
    }
  );

  // ─── POST /api/v1/events ───────────────────────────────────

  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new event',
        tags: ['Events'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'type', 'startsAt'],
          properties: {
            title: { type: 'string', maxLength: 200 },
            type: { type: 'string' },
            startsAt: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string', maxLength: 300 },
            endsAt: { type: 'string' },
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
    },
    async (request, reply) => {
      const body = request.body as {
        title: string;
        type: string;
        startsAt: string;
        description?: string;
        location?: string;
        endsAt?: string;
      };

      const data = await eventService.createEvent(
        request.user.sub,
        body
      );
      return sendSuccess(reply, data, 201);
    }
  );

  // ─── GET /api/v1/events/:id ────────────────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get a single event by ID',
        tags: ['Events'],
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
    },
    async (request, reply) => {
      const data = await eventService.getEvent(
        request.params.id
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── PATCH /api/v1/events/:id ──────────────────────────────

  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Update an event (creator only)',
        tags: ['Events'],
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
            status: { type: 'string' },
            title: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            location: { type: 'string', maxLength: 300 },
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
      const body = request.body as {
        status?: string;
        title?: string;
        description?: string;
        location?: string;
      };

      const data = await eventService.updateEvent(
        request.params.id,
        request.user.sub,
        body
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── POST /api/v1/events/:id/register ─────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/:id/register',
    {
      schema: {
        description: 'Register the current user for an event',
        tags: ['Events'],
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
    },
    async (request, reply) => {
      const data = await eventService.registerForEvent(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data, 201);
    }
  );

  // ─── DELETE /api/v1/events/:id/register ───────────────────

  fastify.delete<{ Params: { id: string } }>(
    '/:id/register',
    {
      schema: {
        description: 'Unregister the current user from an event',
        tags: ['Events'],
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
    },
    async (request, reply) => {
      await eventService.unregisterFromEvent(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, { unregistered: true });
    }
  );

  // ─── GET /api/v1/events/:id/attendees ─────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/:id/attendees',
    {
      schema: {
        description: 'List attendees for an event',
        tags: ['Events'],
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
                items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as {
        limit?: string;
        offset?: string;
      };

      const limit = query.limit
        ? Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
        : 20;
      const offset = query.offset
        ? Math.max(0, parseInt(query.offset, 10) || 0)
        : 0;

      const data = await eventService.listAttendees(
        request.params.id,
        limit,
        offset
      );
      return sendSuccess(reply, data);
    }
  );
};

export default eventRoutes;
