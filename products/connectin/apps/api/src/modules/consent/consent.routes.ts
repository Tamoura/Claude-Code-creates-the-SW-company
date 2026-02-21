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
  fastify.post('/', async (request, reply) => {
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
  fastify.get('/', async (request, reply) => {
    const data = await consentService.listConsents(
      request.user.sub
    );
    return sendSuccess(reply, data);
  });
};

export default consentRoutes;
