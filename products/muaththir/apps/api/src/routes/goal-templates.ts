import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { paginatedResult } from '../lib/pagination';
import { getLocale } from '../lib/locale';

const DIMENSIONS = [
  'academic',
  'social_emotional',
  'behavioural',
  'aspirational',
  'islamic',
  'physical',
] as const;

const AGE_BANDS = [
  'early_years',
  'primary',
  'upper_primary',
  'secondary',
] as const;

const listQuerySchema = z.object({
  dimension: z.enum(DIMENSIONS).optional(),
  ageBand: z.enum(AGE_BANDS).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

function parseGoalTemplatePagination(
  query: { page?: string; limit?: string }
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
  return { page, limit };
}

const goalTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/goal-templates — List goal templates (no auth required)
  fastify.get('/', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({
        type: 'https://muaththir.app/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: parsed.error.errors[0]?.message || 'Validation failed',
        instance: request.url,
      });
    }

    const { dimension, ageBand } = parsed.data;
    const pagination = parseGoalTemplatePagination(parsed.data);
    const where: Record<string, unknown> = {};

    if (dimension) {
      where.dimension = dimension;
    }
    if (ageBand) {
      where.ageBand = ageBand;
    }

    const locale = getLocale(request);

    const [templates, total] = await Promise.all([
      fastify.prisma.goalTemplate.findMany({
        where,
        orderBy: [
          { dimension: 'asc' },
          { ageBand: 'asc' },
          { sortOrder: 'asc' },
        ],
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      fastify.prisma.goalTemplate.count({ where }),
    ]);

    const isAr = locale === 'ar';
    const data = templates.map((t) => ({
      id: t.id,
      dimension: t.dimension,
      ageBand: t.ageBand,
      title: (isAr && t.titleAr) || t.title,
      description: (isAr && t.descriptionAr) || t.description,
      category: t.category,
      sortOrder: t.sortOrder,
    }));

    reply.header('Vary', 'Accept-Language');
    // nosemgrep: javascript.express.security.audit.xss.direct-response-write
    return reply.send(paginatedResult(data, total, pagination));
  });
};

export default goalTemplateRoutes;
