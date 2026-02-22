import { FastifyPluginAsync } from 'fastify';
import { ConsentService } from './consent.service';
import { grantConsentSchema } from './consent.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const consentRoutes: FastifyPluginAsync = async (fastify) => {
  const consentService = new ConsentService(fastify.prisma);

  // All consent routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/consent — grant or revoke consent
  fastify.post('/', {
    schema: {
      description: 'Grant or revoke a consent type for the current user',
      tags: ['Consent'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'granted'],
        properties: {
          type: { type: 'string' },
          granted: { type: 'boolean' },
          version: { type: 'string' },
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
    const result = grantConsentSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await consentService.grantOrRevoke(
      request.user.sub,
      result.data,
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      }
    );
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/consent — list user consents (cursor-paginated)
  fastify.get('/', {
    schema: {
      description: 'List all consent records for the current user',
      tags: ['Consent'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'string' },
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
                properties: {
                  type: { type: 'string' },
                  granted: { type: 'boolean' },
                  version: { type: 'string', nullable: true },
                  grantedAt: { type: 'string', format: 'date-time', nullable: true },
                  revokedAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const query = request.query as {
      cursor?: string;
      limit?: string;
    };

    const limit = query.limit
      ? Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20))
      : 20;

    const result = await consentService.listConsents(
      request.user.sub,
      { cursor: query.cursor, limit }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });
};

export default consentRoutes;
