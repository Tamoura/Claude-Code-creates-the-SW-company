import { FastifyPluginAsync } from 'fastify';
import { ProfileService } from './profile.service';
import {
  updateProfileSchema,
  addExperienceSchema,
  addSkillsSchema,
} from './profile.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const profileService = new ProfileService(fastify.prisma);

  // All profile routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/profiles/me
  fastify.get('/me', {
    schema: {
      description: 'Get the authenticated user\'s own profile',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
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
  }, async (request, reply) => {
    const profile = await profileService.getMyProfile(
      request.user.sub
    );
    return sendSuccess(reply, profile);
  });

  // PUT /api/v1/profiles/me
  fastify.put('/me', {
    schema: {
      description: 'Update the authenticated user\'s profile',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          headline: { type: 'string', maxLength: 220 },
          bio: { type: 'string', maxLength: 2600 },
          location: { type: 'string', maxLength: 100 },
          website: { type: 'string', format: 'uri' },
          avatarUrl: { type: 'string', format: 'uri' },
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
  }, async (request, reply) => {
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
  // Intentionally public to authenticated users (professional networking).
  // Sensitive fields (email, website) are stripped for non-owners in the service layer.
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get a user profile by ID. Sensitive fields are stripped for non-owners.',
        tags: ['Profile'],
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
    },
    async (request, reply) => {
      const profile = await profileService.getProfileById(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, profile);
    }
  );

  // POST /api/v1/profiles/me/experience
  fastify.post('/me/experience', {
    schema: {
      description: 'Add a work experience entry to the current user\'s profile',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'company'],
        properties: {
          title: { type: 'string', maxLength: 100 },
          company: { type: 'string', maxLength: 100 },
          location: { type: 'string', maxLength: 100 },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          current: { type: 'boolean' },
          description: { type: 'string', maxLength: 2000 },
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
  }, async (request, reply) => {
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
  fastify.post('/me/skills', {
    schema: {
      description: 'Add skills to the current user\'s profile',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['skills'],
        properties: {
          skills: {
            type: 'array',
            items: { type: 'string', maxLength: 100 },
            minItems: 1,
            maxItems: 50,
          },
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
  }, async (request, reply) => {
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
