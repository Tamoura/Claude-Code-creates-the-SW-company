import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { AnalyticsService } from '../../services/analytics.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import {
  analyticsOverviewQuerySchema,
  analyticsVolumeQuerySchema,
  analyticsBreakdownQuerySchema,
} from '../../utils/validation.js';
import {
  analyticsOverviewRouteSchema, analyticsVolumeRouteSchema, analyticsPaymentsRouteSchema,
} from '../../schemas/analytics.js';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const analyticsService = new AnalyticsService(fastify.prisma);

  // GET /v1/analytics/overview - Summary statistics
  fastify.get(
    '/overview',
    { onRequest: [fastify.authenticate, fastify.requirePermission('read')], schema: analyticsOverviewRouteSchema },
    async (request, reply) => {
      try {
        analyticsOverviewQuerySchema.parse(request.query);
        const userId = request.currentUser!.id;
        const overview = await analyticsService.getOverview(userId);
        return reply.send(overview);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send(error.toJSON());
        }
        if (error instanceof ZodError) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: error.errors.map((e) => e.message).join(', '),
          });
        }
        logger.error('Analytics error', error);
        throw error;
      }
    },
  );

  // GET /v1/analytics/volume - Time-series volume data
  fastify.get(
    '/volume',
    { onRequest: [fastify.authenticate, fastify.requirePermission('read')], schema: analyticsVolumeRouteSchema },
    async (request, reply) => {
      try {
        const query = analyticsVolumeQuerySchema.parse(request.query);
        const userId = request.currentUser!.id;
        const volume = await analyticsService.getVolume(userId, query.period, query.days);
        return reply.send({ data: volume, period: query.period, days: query.days });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send(error.toJSON());
        }
        if (error instanceof ZodError) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: error.errors.map((e) => e.message).join(', '),
          });
        }
        logger.error('Analytics error', error);
        throw error;
      }
    },
  );

  // GET /v1/analytics/payments - Breakdown by status/network/token
  fastify.get(
    '/payments',
    { onRequest: [fastify.authenticate, fastify.requirePermission('read')], schema: analyticsPaymentsRouteSchema },
    async (request, reply) => {
      try {
        const query = analyticsBreakdownQuerySchema.parse(request.query);
        const userId = request.currentUser!.id;
        const breakdown = await analyticsService.getPaymentBreakdown(userId, query.group_by);
        return reply.send({ data: breakdown, group_by: query.group_by });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send(error.toJSON());
        }
        if (error instanceof ZodError) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: error.errors.map((e) => e.message).join(', '),
          });
        }
        logger.error('Analytics error', error);
        throw error;
      }
    },
  );
};

export default analyticsRoutes;
