import { FastifyPluginAsync } from 'fastify';
import { RiskService } from '../services/risk.service';
import {
  riskStatusUpdateSchema,
  riskCategoryParamSchema,
  riskStatusFilterSchema,
  categorySlugToEnum,
  statusFilterToEnum,
} from '../validations/risk.validation';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';
import { RiskCategory, RiskStatus } from '@prisma/client';

const riskRoutes: FastifyPluginAsync = async (fastify) => {
  const riskService = new RiskService(fastify.prisma);

  // ==========================================================
  // GET /api/v1/risks — Risk summary (4 categories)
  // ==========================================================
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const summary = await riskService.getRiskSummaryForOrg(
        user.organizationId
      );

      return sendSuccess(reply, { summary });
    }
  );

  // ==========================================================
  // GET /api/v1/risks/items/:id — Risk detail
  // Must be registered BEFORE /:category to avoid route conflict
  // ==========================================================
  fastify.get(
    '/items/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const { id } = request.params as { id: string };
      const detail = await riskService.getRiskDetail(
        id,
        user.organizationId
      );

      if (!detail) {
        throw AppError.notFound('Risk item not found');
      }

      return sendSuccess(reply, detail);
    }
  );

  // ==========================================================
  // PATCH /api/v1/risks/items/:id/status — Update risk status
  // ==========================================================
  fastify.patch(
    '/items/:id/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const parsed = riskStatusUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Invalid status'
        );
      }

      const { id } = request.params as { id: string };
      const result = await riskService.updateRiskStatus(
        id,
        user.organizationId,
        parsed.data.status as RiskStatus
      );

      return sendSuccess(reply, result);
    }
  );

  // ==========================================================
  // POST /api/v1/risks/generate — Generate risks from profile
  // ==========================================================
  fastify.post(
    '/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const result = await riskService.generateAndPersistRisks(
        user.organizationId
      );

      return sendSuccess(reply, result, 201);
    }
  );

  // ==========================================================
  // GET /api/v1/risks/:category — Risks by category
  // ==========================================================
  fastify.get(
    '/:category',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const { category } = request.params as { category: string };
      const categoryResult = riskCategoryParamSchema.safeParse(category);
      if (!categoryResult.success) {
        throw AppError.badRequest(
          categoryResult.error.errors[0]?.message ||
            'Invalid risk category'
        );
      }

      const categoryEnum = categorySlugToEnum(
        categoryResult.data
      ) as RiskCategory;

      // Optional status filter from query string
      const query = request.query as { status?: string };
      let statusFilter: RiskStatus | undefined;
      if (query.status) {
        const statusResult = riskStatusFilterSchema.safeParse(
          query.status.toLowerCase()
        );
        if (!statusResult.success) {
          throw AppError.badRequest('Invalid status filter');
        }
        if (statusResult.data) {
          statusFilter = statusFilterToEnum(
            statusResult.data
          ) as RiskStatus;
        }
      }

      const items = await riskService.getRisksByCategory(
        user.organizationId,
        categoryEnum,
        statusFilter ? { status: statusFilter } : undefined
      );

      return sendSuccess(reply, { items });
    }
  );
};

export default riskRoutes;
