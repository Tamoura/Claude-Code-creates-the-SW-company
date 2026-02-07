import { FastifyRequest, FastifyReply } from 'fastify';
import { RiskService } from './service.js';
import {
  currentRiskQuerySchema,
  riskHistoryQuerySchema,
} from './schemas.js';
import { BadRequestError } from '../../lib/errors.js';

export class RiskHandlers {
  constructor(private service: RiskService) {}

  async getCurrent(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.query as Record<string, string>;
    const parsed = currentRiskQuerySchema.safeParse(raw);

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0]?.message || 'Invalid query parameters'
      );
    }

    const { teamId } = parsed.data;
    const result = await this.service.computeCurrentRisk(teamId);
    return reply.code(200).send(result);
  }

  async getHistory(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.query as Record<string, string>;
    const parsed = riskHistoryQuerySchema.safeParse(raw);

    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors[0]?.message || 'Invalid query parameters'
      );
    }

    const { teamId, days } = parsed.data;
    const result = await this.service.getHistory(teamId, days);
    return reply.code(200).send(result);
  }
}
