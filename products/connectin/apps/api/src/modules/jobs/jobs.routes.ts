import { FastifyPluginAsync } from 'fastify';
import { JobsService } from './jobs.service';
import {
  createJobSchema,
  updateJobSchema,
  applyJobSchema,
  jobQuerySchema,
} from './jobs.schemas';
import { sendSuccess } from '../../lib/response';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  const jobsService = new JobsService(fastify.prisma);

  // ─── GET /api/v1/jobs/saved ─────────────────────────────────
  // Must be registered BEFORE /:id routes to avoid conflict
  fastify.get(
    '/saved',
    {
      schema: {
        description: 'List all jobs saved by the current user',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const query = request.query as {
        cursor?: string;
        limit?: string;
      };

      const limit = query.limit
        ? Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20))
        : 20;

      const result = await jobsService.listSavedJobs(
        request.user.sub,
        { cursor: query.cursor, limit }
      );
      return sendSuccess(reply, result.data, 200, result.meta);
    }
  );

  // ─── GET /api/v1/jobs/my-applications ───────────────────────
  // Must be registered BEFORE /:id routes to avoid conflict
  fastify.get(
    '/my-applications',
    {
      schema: {
        description: 'List all jobs the current user has applied to',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const query = request.query as {
        cursor?: string;
        limit?: string;
      };

      const limit = query.limit
        ? Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20))
        : 20;

      const result = await jobsService.listMyApplications(
        request.user.sub,
        { cursor: query.cursor, limit }
      );
      return sendSuccess(reply, result.data, 200, result.meta);
    }
  );

  // ─── POST /api/v1/jobs ──────────────────────────────────────
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new job listing (Recruiter or Admin only)',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'company', 'description'],
          properties: {
            title: { type: 'string', maxLength: 200 },
            company: { type: 'string', maxLength: 200 },
            location: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            requirements: { type: 'string' },
            workType: { type: 'string' },
            experienceLevel: { type: 'string' },
            salaryMin: { type: 'number' },
            salaryMax: { type: 'number' },
            salaryCurrency: { type: 'string' },
            language: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      // Only recruiters and admins can post jobs
      const role = request.user.role;
      if (role !== 'RECRUITER' && role !== 'ADMIN') {
        throw new ForbiddenError(
          'Only recruiters can post jobs'
        );
      }

      const result = createJobSchema.safeParse(request.body);
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await jobsService.createJob(
        request.user.sub,
        result.data
      );
      return sendSuccess(reply, data, 201);
    }
  );

  // ─── GET /api/v1/jobs ───────────────────────────────────────
  fastify.get('/', {
    schema: {
      description: 'Search and list job postings with optional filters',
      tags: ['Jobs'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          location: { type: 'string' },
          type: { type: 'string' },
          remote: { type: 'string' },
          page: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const queryResult = jobQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      throw new ValidationError(
        'Invalid query parameters',
        zodToDetails(queryResult.error)
      );
    }

    const result = await jobsService.searchJobs(
      queryResult.data
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // ─── GET /api/v1/jobs/:id ───────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get a single job posting by ID',
        tags: ['Jobs'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const data = await jobsService.getJobById(
        request.params.id
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── PATCH /api/v1/jobs/:id ────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Update a job listing (owner Recruiter or Admin only)',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string', maxLength: 200 },
            company: { type: 'string', maxLength: 200 },
            location: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            requirements: { type: 'string' },
            workType: { type: 'string' },
            experienceLevel: { type: 'string' },
            salaryMin: { type: 'number' },
            salaryMax: { type: 'number' },
            salaryCurrency: { type: 'string' },
            language: { type: 'string' },
            status: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const role = request.user.role;
      if (role !== 'RECRUITER' && role !== 'ADMIN') {
        throw new ForbiddenError(
          'Only recruiters can update jobs'
        );
      }

      const result = updateJobSchema.safeParse(request.body);
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await jobsService.updateJob(
        request.params.id,
        request.user.sub,
        result.data
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── DELETE /api/v1/jobs/:id ───────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Archive a job listing (owner Recruiter or Admin only)',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const role = request.user.role;
      if (role !== 'RECRUITER' && role !== 'ADMIN') {
        throw new ForbiddenError(
          'Only recruiters can archive jobs'
        );
      }

      const data = await jobsService.archiveJob(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── POST /api/v1/jobs/:id/apply ───────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/:id/apply',
    {
      schema: {
        description: 'Apply to a job listing',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            coverNote: { type: 'string', maxLength: 500 },
          },
        },
        response: {
          201: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const result = applyJobSchema.safeParse(request.body);
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await jobsService.applyToJob(
        request.params.id,
        request.user.sub,
        result.data
      );
      return sendSuccess(reply, data, 201);
    }
  );

  // ─── GET /api/v1/jobs/:id/applications ─────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/:id/applications',
    {
      schema: {
        description: 'List applications for a job (job owner only)',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const role = request.user.role;

      // Only recruiters and admins can view applications
      if (role !== 'RECRUITER' && role !== 'ADMIN') {
        throw new ForbiddenError(
          'Only recruiters can view job applications'
        );
      }

      // Ownership check: verify the job exists and belongs to the
      // current user (or the user is an admin) before calling the service
      const job = await fastify.prisma.job.findUnique({
        where: { id: request.params.id },
        select: { id: true, recruiterId: true },
      });

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      if (role !== 'ADMIN' && job.recruiterId !== request.user.sub) {
        throw new ForbiddenError(
          'You do not own this job listing'
        );
      }

      const data = await jobsService.listApplications(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── DELETE /api/v1/jobs/:jobId/applications/:appId ────────
  fastify.delete<{
    Params: { jobId: string; appId: string };
  }>(
    '/:jobId/applications/:appId',
    {
      schema: {
        description: 'Withdraw an application (applicant only)',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['jobId', 'appId'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
            appId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const data = await jobsService.withdrawApplication(
        request.params.jobId,
        request.params.appId,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── POST /api/v1/jobs/:id/save ────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/:id/save',
    {
      schema: {
        description: 'Save a job to the current user\'s saved jobs list',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          201: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const result = await jobsService.saveJob(
        request.params.id,
        request.user.sub
      );
      // Return 200 if already saved (idempotent), 201 for new save
      const statusCode = result.alreadySaved ? 200 : 201;
      return sendSuccess(reply, { saved: result.saved }, statusCode);
    }
  );

  // ─── DELETE /api/v1/jobs/:id/save ──────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/:id/save',
    {
      schema: {
        description: 'Remove a job from the current user\'s saved jobs list',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const data = await jobsService.unsaveJob(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );
};

export default jobsRoutes;
