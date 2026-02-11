import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { parsePagination, paginatedResult } from '../utils/pagination';

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(100),
  description: z.string().min(10),
  location: z.string().min(1).max(100),
  remote: z.boolean().default(false),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().default('QAR'),
  domains: z.array(z.enum([
    'GOVERNANCE_STRATEGY',
    'RISK_MANAGEMENT',
    'COMPLIANCE_REGULATORY',
    'INFORMATION_SECURITY',
    'AUDIT_ASSURANCE',
    'BUSINESS_CONTINUITY',
  ])),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'PRINCIPAL']),
  requiredTier: z.enum(['FOUNDATION', 'DEVELOPING', 'PROFICIENT', 'EXPERT']).optional(),
  skills: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
});

const applyJobSchema = z.object({
  coverLetter: z.string().max(5000).optional(),
});

const jobRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /jobs - List active jobs
  fastify.get<{
    Querystring: {
      domain?: string;
      level?: string;
      remote?: string;
      location?: string;
      page?: string;
      limit?: string;
    };
  }>('/jobs', async (request, reply) => {
    const { domain, level, remote, location, page, limit } = request.query;
    const pagination = parsePagination({ page, limit });

    const where: any = { status: 'ACTIVE' };
    if (domain) where.domains = { has: domain };
    if (level) where.level = level;
    if (remote !== undefined) where.remote = remote === 'true';
    if (location) where.location = { contains: location, mode: 'insensitive' };

    const [jobs, total] = await Promise.all([
      fastify.prisma.job.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.job.count({ where }),
    ]);

    return reply.send(paginatedResult(jobs, total, pagination));
  });

  // GET /jobs/:id - Get job details
  fastify.get<{ Params: { id: string } }>('/jobs/:id', async (request, reply) => {
    const { id } = request.params;

    const job = await fastify.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    return reply.send({ job });
  });

  // POST /jobs - Create job (admin only)
  fastify.post('/jobs', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const parsed = createJobSchema.safeParse(request.body);
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

      const data: any = { ...parsed.data };
      if (data.expiresAt) {
        data.expiresAt = new Date(data.expiresAt);
      }
      data.postedBy = request.currentUser!.id;

      const job = await fastify.prisma.job.create({ data });

      return reply.code(201).send({ job });
    },
  });

  // PUT /jobs/:id - Update job (admin only)
  fastify.put<{ Params: { id: string } }>('/jobs/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const { id } = request.params;
      const parsed = createJobSchema.partial().safeParse(request.body);
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

      const data: any = { ...parsed.data };
      if (data.expiresAt) {
        data.expiresAt = new Date(data.expiresAt);
      }

      const job = await fastify.prisma.job.update({
        where: { id },
        data,
      });

      return reply.send({ job });
    },
  });

  // POST /jobs/:id/apply - Apply for job
  fastify.post<{ Params: { id: string } }>('/jobs/:id/apply', {
    preHandler: [fastify.authenticate, fastify.requireRole('TALENT')],
    handler: async (request, reply) => {
      const { id } = request.params;
      const parsed = applyJobSchema.safeParse(request.body);
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

      // Check if job exists
      const job = await fastify.prisma.job.findUnique({ where: { id } });
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      if (job.status !== 'ACTIVE') {
        throw new BadRequestError('Job is not active');
      }

      // Check if already applied
      const existing = await fastify.prisma.jobApplication.findUnique({
        where: {
          jobId_userId: {
            jobId: id,
            userId: request.currentUser!.id,
          },
        },
      });

      if (existing) {
        throw new ConflictError('Already applied to this job');
      }

      // Create application
      const application = await fastify.prisma.jobApplication.create({
        data: {
          jobId: id,
          userId: request.currentUser!.id,
          coverLetter: parsed.data.coverLetter,
        },
      });

      return reply.code(201).send({ application });
    },
  });

  // GET /jobs/applications - List user's applications
  fastify.get('/jobs/applications', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const applications = await fastify.prisma.jobApplication.findMany({
        where: { userId: request.currentUser!.id },
        include: {
          job: true,
        },
        orderBy: { appliedAt: 'desc' },
      });

      return reply.send({ applications });
    },
  });
};

export default jobRoutes;
