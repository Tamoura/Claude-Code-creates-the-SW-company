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
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
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

  // GET /api/v1/consent — list user consents
  fastify.get('/', {
    schema: {
      description: 'List all consent records for the current user',
      tags: ['Consent'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
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
  }, async (request, reply) => {
    const data = await consentService.listConsents(
      request.user.sub
    );
    return sendSuccess(reply, data);
  });
};

export default consentRoutes;
