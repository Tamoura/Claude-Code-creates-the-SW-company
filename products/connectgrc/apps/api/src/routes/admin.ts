import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors';
import { parsePagination, paginatedResult } from '../utils/pagination';

const updateUserSchema = z.object({
  role: z.enum(['TALENT', 'EMPLOYER', 'ADMIN']).optional(),
  emailVerified: z.boolean().optional(),
});

const seedQuestionsSchema = z.object({
  count: z.number().int().min(1).max(100).default(10),
  domain: z.enum([
    'GOVERNANCE_STRATEGY',
    'RISK_MANAGEMENT',
    'COMPLIANCE_REGULATORY',
    'INFORMATION_SECURITY',
    'AUDIT_ASSURANCE',
    'BUSINESS_CONTINUITY',
  ]),
});

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/users - List all users
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      role?: string;
    };
  }>('/admin/users', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const { page, limit, role } = request.query;
      const pagination = parsePagination({ page, limit });

      const where: any = {};
      if (role) where.role = role;

      const [users, total] = await Promise.all([
        fastify.prisma.user.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        fastify.prisma.user.count({ where }),
      ]);

      return reply.send(paginatedResult(users, total, pagination)); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
    },
  });

  // PATCH /admin/users/:id - Update user
  fastify.patch<{ Params: { id: string } }>('/admin/users/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const { id } = request.params;
      const parsed = updateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: parsed.error.issues,
          },
        });
      }

      const user = await fastify.prisma.user.update({
        where: { id },
        data: parsed.data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send({ user });
    },
  });

  // GET /admin/analytics - Dashboard analytics
  fastify.get('/admin/analytics', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const [userCounts, assessmentStats, jobStats] = await Promise.all([
        fastify.prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),
        fastify.prisma.assessment.groupBy({
          by: ['status'],
          _count: true,
        }),
        fastify.prisma.job.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);

      const analytics = {
        users: {
          total: userCounts.reduce((sum, item) => sum + item._count, 0),
          byRole: userCounts.reduce((acc, item) => {
            acc[item.role] = item._count;
            return acc;
          }, {} as Record<string, number>),
        },
        assessments: {
          total: assessmentStats.reduce((sum, item) => sum + item._count, 0),
          byStatus: assessmentStats.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>),
        },
        jobs: {
          total: jobStats.reduce((sum, item) => sum + item._count, 0),
          byStatus: jobStats.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>),
        },
      };

      return reply.send({ analytics });
    },
  });

  // POST /admin/seed-questions - Seed sample questions
  fastify.post('/admin/seed-questions', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const parsed = seedQuestionsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: parsed.error.issues,
          },
        });
      }

      const { count, domain } = parsed.data;

      // Create sample questions
      const questions = [];
      for (let i = 0; i < count; i++) {
        const question = await fastify.prisma.question.create({
          data: {
            domain,
            type: 'MULTIPLE_CHOICE',
            difficulty: 'INTERMEDIATE',
            text: `Sample question ${i + 1} for ${domain}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            explanation: `This is the explanation for question ${i + 1}`,
            tags: [domain, 'sample'],
          },
        });
        questions.push(question);
      }

      return reply.code(201).send({
        message: `Created ${count} sample questions`,
        questions,
      });
    },
  });
};

export default adminRoutes;
