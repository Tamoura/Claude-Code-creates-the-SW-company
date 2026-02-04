import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { AnalyticsService } from '../../services/analytics.service.js';
import {
  analyticsOverviewQuerySchema,
  analyticsVolumeQuerySchema,
  analyticsBreakdownQuerySchema,
} from '../../utils/validation.js';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const analyticsService = new AnalyticsService(fastify.prisma);

  // GET /v1/analytics/overview - Summary statistics
  fastify.get(
    '/overview',
    { onRequest: [fastify.authenticate, fastify.requirePermission('read')] },
    async (request, reply) => {
      try {
        const query = analyticsOverviewQuerySchema.parse(request.query);
        const userId = request.currentUser!.id;
        const overview = await analyticsService.getOverview(userId);
        return reply.send(overview);
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: error.errors.map((e) => e.message).join(', '),
          });
        }
        throw error;
      }
    },
  );

  // GET /v1/analytics/volume - Time-series volume data
  fastify.get(
    '/volume',
    { onRequest: [fastify.authenticate, fastify.requirePermission('read')] },
    async (request, reply) => {
      try {
        const query = analyticsVolumeQuerySchema.parse(request.query);
        const userId = request.currentUser!.id;
        const volume = await analyticsService.getVolume(userId, query.period, query.days);
        return reply.send({ data: volume, period: query.period, days: query.days });
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: error.errors.map((e) => e.message).join(', '),
          });
        }
        throw error;
      }
    },
  );

  // GET /v1/analytics/payments - Breakdown by status/network/token
  fastify.get(
    '/payments',
    { onRequest: [fastify.authenticate, fastify.requirePermission('read')] },
    async (request, reply) => {
      try {
        const query = analyticsBreakdownQuerySchema.parse(request.query);
        const userId = request.currentUser!.id;
        const breakdown = await analyticsService.getPaymentBreakdown(userId, query.group_by);
        return reply.send({ data: breakdown, group_by: query.group_by });
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: error.errors.map((e) => e.message).join(', '),
          });
        }
        throw error;
      }
    },
  );
};

export default analyticsRoutes;
