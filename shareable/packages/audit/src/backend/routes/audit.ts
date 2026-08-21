/**
 * Audit Log Query Routes
 *
 * Read-only endpoints for querying audit logs.
 * Requires admin authentication.
 */

import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { AuditLogService } from '../services/audit-log.service.js';

const querySchema = z.object({
  actor: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export interface AuditRoutesOptions {
  /** AuditLogService instance. If not provided, creates one from fastify.prisma */
  auditService?: AuditLogService;
}

const auditRoutes: FastifyPluginAsync<AuditRoutesOptions> = async (fastify, opts) => {
  const auditService = opts.auditService ?? new AuditLogService(fastify.prisma);

  // All routes require admin
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireAdmin);

  // GET /audit-logs
  fastify.get('/', async (request, reply) => {
    try {
      const q = querySchema.parse(request.query);
      const entries = await auditService.query({
        actor: q.actor,
        action: q.action,
        resourceType: q.resource_type,
        from: q.from,
        to: q.to,
        limit: q.limit,
        offset: q.offset,
      });

      return reply.send({
        data: entries,
        pagination: { limit: q.limit, offset: q.offset },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ status: 400, detail: error.message });
      }
      throw error;
    }
  });

  // GET /audit-logs/stats
  fastify.get('/stats', async (request, reply) => {
    if (!fastify.prisma) {
      return reply.send({ buffer_size: auditService.bufferSize, storage: 'in-memory' });
    }

    const total = await fastify.prisma.auditLog.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await fastify.prisma.auditLog.count({ where: { timestamp: { gte: today } } });

    return reply.send({
      total,
      today: todayCount,
      buffer_size: auditService.bufferSize,
      storage: 'database',
    });
  });
};

export default auditRoutes;
