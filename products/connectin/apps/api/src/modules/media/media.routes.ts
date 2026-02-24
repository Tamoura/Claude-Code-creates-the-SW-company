import { FastifyPluginAsync } from 'fastify';
import { MediaService } from './media.service';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { getStorage } from '../../lib/storage';
import { MediaType } from '@prisma/client';

const mediaRoutes: FastifyPluginAsync = async (fastify) => {
  const mediaService = new MediaService(
    fastify.prisma,
    getStorage()
  );

  // All media routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/media/upload
  fastify.post('/upload', {
    schema: {
      description: 'Upload a media file (image, video, or document)',
      tags: ['Media'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
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
        max: 20,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      throw new ValidationError('No file uploaded');
    }

    const buffer = await data.toBuffer();
    const typeField =
      (data.fields.type as { value?: string } | undefined)?.value;

    if (
      !typeField ||
      !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(typeField)
    ) {
      throw new ValidationError(
        'type field is required (IMAGE, VIDEO, or DOCUMENT)'
      );
    }

    const altTextField =
      (data.fields.altText as { value?: string } | undefined)?.value;

    const result = await mediaService.uploadMedia(
      request.user.sub,
      {
        filename: data.filename,
        mimetype: data.mimetype,
        data: buffer,
      },
      typeField as MediaType,
      altTextField
    );

    return sendSuccess(reply, result, 201);
  });

  // GET /api/v1/media/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get media metadata by ID',
        tags: ['Media'],
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
      const data = await mediaService.getMedia(
        request.params.id
      );
      return sendSuccess(reply, data);
    }
  );

  // DELETE /api/v1/media/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Delete own media by ID',
        tags: ['Media'],
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
      const data = await mediaService.deleteMedia(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );
};

export default mediaRoutes;
