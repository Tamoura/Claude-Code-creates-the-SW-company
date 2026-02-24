import { FastifyPluginAsync } from 'fastify';
import { SalaryInsightsService } from './salary-insights.service';
import { sendSuccess, sendError } from '../../lib/response';

const salaryInsightsRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new SalaryInsightsService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/salary-insights?title=...&location=...&experienceLevel=...
  fastify.get('/', {
    schema: {
      description: 'Get salary insights for a job title with optional filters',
      tags: ['Salary Insights'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          location: { type: 'string' },
          experienceLevel: { type: 'string', enum: ['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'] },
          currency: { type: 'string' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const query = request.query as any;

    if (!query.title?.trim()) {
      return sendError(reply, 400, 'BAD_REQUEST', 'Query parameter "title" is required');
    }

    const data = await svc.getInsights(query);
    return sendSuccess(reply, data);
  });
};

export default salaryInsightsRoutes;
