import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../lib/errors';
import { parsePagination, paginatedResult } from '../lib/pagination';
import { verifyChildOwnership } from '../lib/ownership';

function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

function validateQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

const DIMENSIONS = [
  'academic',
  'social_emotional',
  'behavioural',
  'aspirational',
  'islamic',
  'physical',
] as const;

const GOAL_STATUSES = ['active', 'completed', 'paused'] as const;

const createGoalSchema = z.object({
  dimension: z.enum(DIMENSIONS).optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  targetDate: z.string().date().optional().nullable(),
  templateId: z.string().optional().nullable(),
});

const updateGoalSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  targetDate: z.string().date().optional().nullable(),
  status: z.enum(GOAL_STATUSES).optional(),
  dimension: z.enum(DIMENSIONS).optional(),
});

const listGoalsQuery = z.object({
  dimension: z.enum(DIMENSIONS).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

function formatGoal(goal: {
  id: string;
  childId: string;
  dimension: string;
  title: string;
  description: string | null;
  targetDate: Date | null;
  status: string;
  templateId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: goal.id,
    childId: goal.childId,
    dimension: goal.dimension,
    title: goal.title,
    description: goal.description,
    targetDate: goal.targetDate
      ? goal.targetDate.toISOString().split('T')[0]
      : null,
    status: goal.status,
    templateId: goal.templateId ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

const goalRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/children/:childId/goals
  fastify.post('/:childId/goals', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const data = validateBody(createGoalSchema, request.body);

    let dimension = data.dimension;
    let title = data.title;
    let description = data.description;
    let templateId: string | null = null;

    if (data.templateId) {
      const template = await fastify.prisma.goalTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (!template) {
        throw new NotFoundError('Goal template not found');
      }

      // Use template values as defaults, allow user overrides
      dimension = data.dimension || (template.dimension as typeof dimension);
      title = data.title || template.title;
      description = data.description !== undefined ? data.description : template.description;
      templateId = template.id;
    }

    // Validate required fields after template resolution
    if (!dimension) {
      throw new ValidationError('Dimension is required', {
        dimension: ['Dimension is required when not using a template'],
      });
    }
    if (!title) {
      throw new ValidationError('Title is required', {
        title: ['Title is required when not using a template'],
      });
    }

    const goal = await fastify.prisma.goal.create({
      data: {
        childId,
        dimension,
        title,
        description: description ?? null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        templateId,
      },
    });

    return reply.code(201).send(formatGoal(goal));
  });

  // GET /api/children/:childId/goals
  fastify.get('/:childId/goals', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const query = validateQuery(listGoalsQuery, request.query);
    const pagination = parsePagination(query);

    const where: Record<string, unknown> = { childId };

    if (query.dimension) {
      where.dimension = query.dimension;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [goals, total] = await Promise.all([
      fastify.prisma.goal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      fastify.prisma.goal.count({ where }),
    ]);

    const formatted = goals.map(formatGoal);
    return reply.send(paginatedResult(formatted, total, pagination));
  });

  // GET /api/children/:childId/goals/:goalId
  fastify.get('/:childId/goals/:goalId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId, goalId } = request.params as {
      childId: string;
      goalId: string;
    };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const goal = await fastify.prisma.goal.findFirst({
      where: { id: goalId, childId },
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    return reply.send(formatGoal(goal));
  });

  // PATCH /api/children/:childId/goals/:goalId
  fastify.patch('/:childId/goals/:goalId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId, goalId } = request.params as {
      childId: string;
      goalId: string;
    };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const existing = await fastify.prisma.goal.findFirst({
      where: { id: goalId, childId },
    });

    if (!existing) {
      throw new NotFoundError('Goal not found');
    }

    const data = validateBody(updateGoalSchema, request.body);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.targetDate !== undefined) {
      updateData.targetDate = data.targetDate
        ? new Date(data.targetDate)
        : null;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.dimension !== undefined) {
      updateData.dimension = data.dimension;
    }

    const updated = await fastify.prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });

    return reply.send(formatGoal(updated));
  });

  // DELETE /api/children/:childId/goals/:goalId
  fastify.delete('/:childId/goals/:goalId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId, goalId } = request.params as {
      childId: string;
      goalId: string;
    };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const goal = await fastify.prisma.goal.findFirst({
      where: { id: goalId, childId },
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    await fastify.prisma.goal.delete({
      where: { id: goalId },
    });

    return reply.code(204).send();
  });
};

export default goalRoutes;
