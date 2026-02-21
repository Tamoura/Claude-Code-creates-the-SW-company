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
} from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  const jobsService = new JobsService(fastify.prisma);

  // ─── GET /api/v1/jobs/saved ─────────────────────────────────
  // Must be registered BEFORE /:id routes to avoid conflict
  fastify.get(
    '/saved',
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const data = await jobsService.listSavedJobs(
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // ─── POST /api/v1/jobs ──────────────────────────────────────
  fastify.post(
    '/',
    {
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
  fastify.get('/', async (request, reply) => {
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
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
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
