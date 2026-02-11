import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

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
});

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
    const where: Record<string, unknown> = {};

    if (dimension) {
      where.dimension = dimension;
    }
    if (ageBand) {
      where.ageBand = ageBand;
    }

    const templates = await fastify.prisma.goalTemplate.findMany({
      where,
      orderBy: [
        { dimension: 'asc' },
        { ageBand: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return reply.send({ data: templates });
  });
};

export default goalTemplateRoutes;
