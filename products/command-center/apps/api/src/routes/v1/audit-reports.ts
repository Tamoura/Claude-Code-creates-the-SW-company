import type { FastifyInstance } from 'fastify';
import { getAuditReports } from '../../services/audit-reports.service.js';

export async function auditReportRoutes(fastify: FastifyInstance) {
  fastify.get('/audit/reports', async () => {
    return getAuditReports();
  });
}
