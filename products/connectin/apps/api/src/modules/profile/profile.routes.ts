import { FastifyPluginAsync } from 'fastify';
import { ProfileService } from './profile.service';
import {
  updateProfileSchema,
  addExperienceSchema,
  updateExperienceSchema,
  addSkillsSchema,
  addEducationSchema,
  updateEducationSchema,
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
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
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
        additionalProperties: false,
        properties: {
          headlineEn: { type: 'string', maxLength: 220 },
          headlineAr: { type: 'string', maxLength: 220 },
          summaryEn: { type: 'string' },
          summaryAr: { type: 'string' },
          location: { type: 'string', maxLength: 100 },
          website: { type: 'string' },
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
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
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
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
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
        additionalProperties: false,
        required: ['title', 'company'],
        properties: {
          title: { type: 'string', maxLength: 100 },
          company: { type: 'string', maxLength: 100 },
          location: { type: 'string', maxLength: 100 },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          isCurrent: { type: 'boolean' },
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
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
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

  // PUT /api/v1/profiles/me/experience/:id
  fastify.put<{ Params: { id: string } }>(
    '/me/experience/:id',
    {
      schema: {
        description:
          'Update a work experience entry on the current user\'s profile',
        tags: ['Profile'],
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
            location: { type: 'string', maxLength: 100 },
            startDate: { type: 'string' },
            endDate: { type: 'string', nullable: true },
            isCurrent: { type: 'boolean' },
            description: { type: 'string', maxLength: 2000 },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
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
    },
    async (request, reply) => {
      const result = updateExperienceSchema.safeParse(
        request.body
      );
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const updated =
        await profileService.updateExperience(
          request.user.sub,
          request.params.id,
          result.data
        );
      return sendSuccess(reply, updated);
    }
  );

  // DELETE /api/v1/profiles/me/experience/:id
  fastify.delete<{ Params: { id: string } }>(
    '/me/experience/:id',
    {
      schema: {
        description:
          'Delete a work experience entry from the current user\'s profile',
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
      const result = await profileService.deleteExperience(
        request.user.sub,
        request.params.id
      );
      return sendSuccess(reply, result);
    }
  );

  // POST /api/v1/profiles/me/skills
  fastify.post('/me/skills', {
    schema: {
      description: 'Add skills to the current user\'s profile',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['skillIds'],
        properties: {
          skillIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
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
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
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

  // POST /api/v1/profiles/me/education
  fastify.post('/me/education', {
    schema: {
      description: 'Add an education entry to the current user\'s profile',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['institution', 'degree', 'startYear'],
        properties: {
          institution: { type: 'string', maxLength: 200 },
          degree: { type: 'string', maxLength: 200 },
          fieldOfStudy: { type: 'string', maxLength: 200 },
          description: { type: 'string' },
          startYear: { type: 'integer', minimum: 1950, maximum: 2030 },
          endYear: { type: 'integer', minimum: 1950, maximum: 2030 },
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
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = addEducationSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const education = await profileService.addEducation(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, education, 201);
  });

  // PUT /api/v1/profiles/me/education/:id
  fastify.put<{ Params: { id: string } }>(
    '/me/education/:id',
    {
      schema: {
        description: 'Update an education entry',
        tags: ['Profile'],
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
            institution: { type: 'string', maxLength: 200 },
            degree: { type: 'string', maxLength: 200 },
            fieldOfStudy: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            startYear: { type: 'integer', minimum: 1950, maximum: 2030 },
            endYear: { type: 'integer', minimum: 1950, maximum: 2030 },
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
      const result = updateEducationSchema.safeParse(
        request.body
      );
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const education = await profileService.updateEducation(
        request.user.sub,
        request.params.id,
        result.data
      );
      return sendSuccess(reply, education);
    }
  );

  // DELETE /api/v1/profiles/me/education/:id
  fastify.delete<{ Params: { id: string } }>(
    '/me/education/:id',
    {
      schema: {
        description: 'Delete an education entry',
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
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const result = await profileService.deleteEducation(
        request.user.sub,
        request.params.id
      );
      return sendSuccess(reply, result);
    }
  );
};

export default profileRoutes;
