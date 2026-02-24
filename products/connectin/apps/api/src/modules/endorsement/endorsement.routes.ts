import { FastifyPluginAsync } from 'fastify';
import { EndorsementService } from './endorsement.service';
import { endorseSkillSchema } from './endorsement.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const endorsementRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const endorsementService = new EndorsementService(
    fastify.prisma
  );

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/endorsements — endorse a skill
  fastify.post('/', {
    schema: {
      description: 'Endorse a skill',
      tags: ['Endorsements'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['profileSkillId'],
        properties: {
          profileSkillId: {
            type: 'string',
            format: 'uuid',
          },
        },
      },
      response: {
        201: {
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
  }, async (request, reply) => {
    const result = endorseSkillSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await endorsementService.endorseSkill(
      request.user.sub,
      result.data.profileSkillId
    );
    return sendSuccess(reply, data, 201);
  });

  // DELETE /api/v1/endorsements/:profileSkillId — remove endorsement
  fastify.delete<{
    Params: { profileSkillId: string };
  }>(
    '/:profileSkillId',
    {
      schema: {
        description: 'Remove an endorsement',
        tags: ['Endorsements'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['profileSkillId'],
          properties: {
            profileSkillId: { type: 'string' },
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
    },
    async (request, reply) => {
      const data =
        await endorsementService.removeEndorsement(
          request.user.sub,
          request.params.profileSkillId
        );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/endorsements/skill/:profileSkillId — list endorsers
  fastify.get<{
    Params: { profileSkillId: string };
  }>(
    '/skill/:profileSkillId',
    {
      schema: {
        description: 'List endorsers for a skill',
        tags: ['Endorsements'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['profileSkillId'],
          properties: {
            profileSkillId: { type: 'string' },
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
    },
    async (request, reply) => {
      const data =
        await endorsementService.getEndorsersForSkill(
          request.params.profileSkillId
        );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/endorsements/by-me — my endorsements
  fastify.get('/by-me', {
    schema: {
      description:
        'List endorsements made by the current user',
      tags: ['Endorsements'],
      security: [{ bearerAuth: [] }],
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
  }, async (request, reply) => {
    const data =
      await endorsementService.getMyEndorsements(
        request.user.sub
      );
    return sendSuccess(reply, data);
  });
};

export default endorsementRoutes;
