import { FastifyPluginAsync } from 'fastify';
import { CostService } from '../services/cost.service';
import { CloudSpendService } from '../services/cloud-spend.service';
import {
  createTcoSchema,
  cloudSpendCreateSchema,
  cloudSpendAnalyzeSchema,
} from '../validations/cost.validation';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';

const costRoutes: FastifyPluginAsync = async (fastify) => {
  const costService = new CostService(fastify.prisma);
  const cloudSpendService = new CloudSpendService(fastify.prisma);

  // ==========================================================
  // POST /api/v1/costs/tco — Create TCO comparison
  // ==========================================================
  fastify.post(
    '/tco',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createTcoSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Invalid TCO data'
        );
      }

      const userId = (request.user as { sub: string }).sub;
      const result = await costService.createComparison(
        userId,
        parsed.data.title,
        parsed.data.options
      );

      return sendSuccess(reply, result, 201);
    }
  );

  // ==========================================================
  // GET /api/v1/costs/tco — List user's TCO comparisons
  // ==========================================================
  fastify.get(
    '/tco',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const comparisons = await costService.listComparisons(userId);

      return sendSuccess(reply, { comparisons });
    }
  );

  // ==========================================================
  // GET /api/v1/costs/tco/:id — Get TCO with projections
  // ==========================================================
  fastify.get(
    '/tco/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const { id } = request.params as { id: string };

      const comparison = await costService.getComparison(id, userId);
      if (!comparison) {
        throw AppError.notFound('TCO comparison not found');
      }

      return sendSuccess(reply, comparison);
    }
  );

  // ==========================================================
  // POST /api/v1/costs/cloud-spend — Create cloud spend entry
  // ==========================================================
  fastify.post(
    '/cloud-spend',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = cloudSpendCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Invalid cloud spend data'
        );
      }

      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const entry = await cloudSpendService.createEntry(
        userId,
        user.organizationId,
        parsed.data
      );

      return sendSuccess(reply, entry, 201);
    }
  );

  // ==========================================================
  // GET /api/v1/costs/cloud-spend — List org cloud spend entries
  // ==========================================================
  fastify.get(
    '/cloud-spend',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const entries = await cloudSpendService.listEntries(
        user.organizationId
      );

      return sendSuccess(reply, { entries });
    }
  );

  // ==========================================================
  // POST /api/v1/costs/cloud-spend/analyze — Benchmarks + recs
  // ==========================================================
  fastify.post(
    '/cloud-spend/analyze',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = cloudSpendAnalyzeSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.badRequest(
          parsed.error.errors[0]?.message || 'Invalid analysis data'
        );
      }

      const benchmarks = cloudSpendService.getBenchmarks(
        parsed.data.companySize,
        parsed.data.provider
      );

      const recommendations = cloudSpendService.getRecommendations({
        provider: parsed.data.provider,
        totalMonthly: parsed.data.totalMonthly,
        spendBreakdown: parsed.data.spendBreakdown,
        companySize: parsed.data.companySize,
      });

      return sendSuccess(reply, { benchmarks, recommendations });
    }
  );
};

export default costRoutes;
