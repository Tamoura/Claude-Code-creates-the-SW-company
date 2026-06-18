import { FastifyPluginAsync } from 'fastify';
import { AdrService } from '../services/adr.service';
import {
  createAdrSchema,
  updateAdrSchema,
  adrStatusUpdateSchema,
  adrListQuerySchema,
} from '../validations/adr.validation';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';

const adrRoutes: FastifyPluginAsync = async (fastify) => {
  const adrService = new AdrService(fastify.prisma);

  /**
   * Helper to get organization ID from authenticated user.
   */
  async function getOrgId(userId: string): Promise<string> {
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw AppError.notFound('User not found');
    return user.organizationId;
  }

  // ==========================================================
  // POST /api/v1/adrs — Create ADR
  // ==========================================================
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createAdrSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Validation failed'
        );
      }

      const userId = (request.user as { sub: string }).sub;
      const orgId = await getOrgId(userId);

      const adr = await adrService.create(orgId, parsed.data);
      return sendSuccess(reply, adr, 201);
    }
  );

  // ==========================================================
  // GET /api/v1/adrs — List ADRs
  // ==========================================================
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryParsed = adrListQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        throw AppError.badRequest('Invalid query parameters');
      }

      const userId = (request.user as { sub: string }).sub;
      const orgId = await getOrgId(userId);

      const result = await adrService.list(orgId, {
        status: queryParsed.data.status,
        limit: queryParsed.data.limit,
        offset: queryParsed.data.offset,
      });

      return sendSuccess(reply, result);
    }
  );

  // ==========================================================
  // GET /api/v1/adrs/:id — ADR detail
  // ==========================================================
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const orgId = await getOrgId(userId);
      const { id } = request.params as { id: string };

      const adr = await adrService.getById(id, orgId);
      return sendSuccess(reply, adr);
    }
  );

  // ==========================================================
  // PUT /api/v1/adrs/:id — Update ADR
  // ==========================================================
  fastify.put(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = updateAdrSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Validation failed'
        );
      }

      const userId = (request.user as { sub: string }).sub;
      const orgId = await getOrgId(userId);
      const { id } = request.params as { id: string };

      const adr = await adrService.update(id, orgId, parsed.data);
      return sendSuccess(reply, adr);
    }
  );

  // ==========================================================
  // PATCH /api/v1/adrs/:id/status — Transition ADR status
  // ==========================================================
  fastify.patch(
    '/:id/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = adrStatusUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Invalid status'
        );
      }

      const userId = (request.user as { sub: string }).sub;
      const orgId = await getOrgId(userId);
      const { id } = request.params as { id: string };

      const adr = await adrService.updateStatus(
        id,
        orgId,
        parsed.data.status
      );
      return sendSuccess(reply, adr);
    }
  );

  // ==========================================================
  // DELETE /api/v1/adrs/:id — Archive ADR (soft delete)
  // ==========================================================
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const orgId = await getOrgId(userId);
      const { id } = request.params as { id: string };

      const adr = await adrService.archive(id, orgId);
      return sendSuccess(reply, adr);
    }
  );
};

export default adrRoutes;
