import { FastifyPluginAsync } from 'fastify';
import { RecommendationService } from './recommendation.service';
import { sendSuccess } from '../../lib/response';

const recommendationRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new RecommendationService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/recommendations/:recipientId — write a recommendation
  fastify.post<{ Params: { recipientId: string } }>('/:recipientId', {
    schema: {
      description: 'Write a recommendation for a connection',
      tags: ['Recommendations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['recipientId'],
        properties: { recipientId: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['content', 'relationship'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 3000 },
          relationship: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
      response: { 201: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.writeRecommendation(
      request.user.sub,
      request.params.recipientId,
      request.body as any
    );
    return sendSuccess(reply, data, 201);
  });

  // PUT /api/v1/recommendations/:id/accept
  fastify.put<{ Params: { id: string } }>('/:id/accept', {
    schema: {
      description: 'Accept a recommendation',
      tags: ['Recommendations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.acceptRecommendation(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });

  // PUT /api/v1/recommendations/:id/decline
  fastify.put<{ Params: { id: string } }>('/:id/decline', {
    schema: {
      description: 'Decline a recommendation',
      tags: ['Recommendations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.declineRecommendation(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/recommendations/user/:userId
  fastify.get<{ Params: { userId: string } }>('/user/:userId', {
    schema: {
      description: 'Get accepted recommendations for a user',
      tags: ['Recommendations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.getUserRecommendations(request.params.userId);
    return sendSuccess(reply, data);
  });
};

export default recommendationRoutes;
