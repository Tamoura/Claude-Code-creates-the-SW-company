import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateQuery, recommendationQuerySchema } from '../../utils/validation';
import { getRecommendations } from './service';

export default async function recommendationRoutes(fastify: FastifyInstance) {
  // GET /recommendations
  fastify.get('/', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validateQuery(recommendationQuerySchema, request.query);
    const tenantId = request.tenantId!;

    const result = await getRecommendations(
      fastify.prisma,
      fastify.redis,
      tenantId,
      query.userId,
      query.limit,
      query.strategy,
      query.productId,
      query.placementId
    );

    return result;
  });
}
