import { FastifyRequest, FastifyReply } from 'fastify';
import { MetricsService } from './service.js';
import {
  velocityQuerySchema,
  coverageQuerySchema,
  summaryQuerySchema,
  aggregateQuerySchema,
} from './schemas.js';
import { BadRequestError } from '../../lib/errors.js';

export class MetricsHandlers {
  constructor(private service: MetricsService) {}

  async getVelocity(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.query as Record<string, string>;
    const parsed = velocityQuerySchema.safeParse(raw);

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0]?.message || 'Invalid query parameters'
      );
    }

    const { teamId, period } = parsed.data;
    const result = await this.service.getVelocity(teamId, period);
    return reply.code(200).send(result);
  }

  async getCoverage(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.query as Record<string, string>;
    const parsed = coverageQuerySchema.safeParse(raw);

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0]?.message || 'Invalid query parameters'
      );
    }

    const { teamId, repoId } = parsed.data;
    const result = await this.service.getCoverage(teamId, repoId);
    return reply.code(200).send(result);
  }

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.query as Record<string, string>;
    const parsed = summaryQuerySchema.safeParse(raw);

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0]?.message || 'Invalid query parameters'
      );
    }

    const { teamId, period } = parsed.data;
    const result = await this.service.getSummary(teamId, period);
    return reply.code(200).send(result);
  }

  async runAggregation(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.query as Record<string, string>;
    const parsed = aggregateQuerySchema.safeParse(raw);

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0]?.message || 'Invalid query parameters'
      );
    }

    const { teamId } = parsed.data;
    const result = await this.service.runAggregation(teamId);
    return reply.code(200).send(result);
  }
}
