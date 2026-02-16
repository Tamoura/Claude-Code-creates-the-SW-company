import type { FastifyInstance } from 'fastify';
import { getAuditReport } from '../../services/audit-reports.service.js';

export async function auditReportRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: { agent?: string; product?: string; status?: string; limit?: string };
  }>('/audit/reports', async (request) => {
    const { agent, product, status, limit } = request.query;
    return getAuditReport({
      agent,
      product,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });
}
