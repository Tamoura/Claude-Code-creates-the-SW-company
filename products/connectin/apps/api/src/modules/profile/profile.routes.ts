import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { ProfileService } from './profile.service';
import {
  updateProfileSchema,
  addExperienceSchema,
  addSkillsSchema,
} from './profile.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';

function zodToDetails(
  err: ZodError
): Array<{ field: string; message: string }> {
  return err.errors.map((e) => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));
}

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const profileService = new ProfileService(fastify.prisma);

  // All profile routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/profiles/me
  fastify.get('/me', async (request, reply) => {
    const profile = await profileService.getMyProfile(
      request.user.sub
    );
    return sendSuccess(reply, profile);
  });

  // PUT /api/v1/profiles/me
  fastify.put('/me', async (request, reply) => {
    const result = updateProfileSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const profile = await profileService.updateProfile(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, profile);
  });

  // GET /api/v1/profiles/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const profile = await profileService.getProfileById(
        request.params.id
      );
      return sendSuccess(reply, profile);
    }
  );

  // POST /api/v1/profiles/me/experience
  fastify.post('/me/experience', async (request, reply) => {
    const result = addExperienceSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const experience = await profileService.addExperience(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, experience, 201);
  });

  // POST /api/v1/profiles/me/skills
  fastify.post('/me/skills', async (request, reply) => {
    const result = addSkillsSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const skills = await profileService.addSkills(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, skills);
  });
};

export default profileRoutes;
