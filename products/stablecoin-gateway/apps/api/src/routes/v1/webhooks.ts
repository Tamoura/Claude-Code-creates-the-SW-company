import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { createWebhookSchema, updateWebhookSchema, validateBody } from '../../utils/validation.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generate a webhook secret with whsec_ prefix (Stripe-style)
 */
function generateWebhookSecret(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `whsec_${randomBytes}`;
}

/**
 * Hash webhook secret using bcrypt for secure storage
 */
async function hashWebhookSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/webhooks - Create webhook
  fastify.post('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const body = validateBody(createWebhookSchema, request.body);
      const userId = request.currentUser!.id;

      // Generate webhook secret
      const secret = generateWebhookSecret();
      const hashedSecret = await hashWebhookSecret(secret);

      // Create webhook endpoint
      const webhook = await fastify.prisma.webhookEndpoint.create({
        data: {
          userId,
          url: body.url,
          secret: hashedSecret,
          events: body.events,
          enabled: body.enabled ?? true,
          description: body.description,
        },
      });

      logger.info('Webhook created', {
        userId,
        webhookId: webhook.id,
        url: webhook.url,
        events: webhook.events,
      });

      // Return webhook with plaintext secret (ONLY TIME IT'S SHOWN)
      return reply.code(201).send({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        description: webhook.description,
        secret, // Plaintext secret - only shown once
        created_at: webhook.createdAt.toISOString(),
        updated_at: webhook.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error creating webhook', error);
      throw error;
    }
  });

  // GET /v1/webhooks - List all webhooks
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;

      const webhooks = await fastify.prisma.webhookEndpoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Do NOT return secrets in list
      const response = webhooks.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        description: webhook.description,
        created_at: webhook.createdAt.toISOString(),
        updated_at: webhook.updatedAt.toISOString(),
      }));

      return reply.send({ data: response });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error listing webhooks', error);
      throw error;
    }
  });

  // GET /v1/webhooks/:id - Get webhook by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      const webhook = await fastify.prisma.webhookEndpoint.findFirst({
        where: {
          id,
          userId, // Enforce ownership
        },
      });

      if (!webhook) {
        throw new AppError(404, 'webhook-not-found', 'Webhook not found');
      }

      // Do NOT return secret
      return reply.send({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        description: webhook.description,
        created_at: webhook.createdAt.toISOString(),
        updated_at: webhook.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error getting webhook', error);
      throw error;
    }
  });

  // PATCH /v1/webhooks/:id - Update webhook
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;
      const updates = validateBody(updateWebhookSchema, request.body);

      // Check webhook exists and user owns it
      const existingWebhook = await fastify.prisma.webhookEndpoint.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingWebhook) {
        throw new AppError(404, 'webhook-not-found', 'Webhook not found');
      }

      // Build update data (whitelist - prevent updating secret)
      const updateData: any = {};
      if (updates.url !== undefined) {
        updateData.url = updates.url;
      }
      if (updates.events !== undefined) {
        updateData.events = updates.events;
      }
      if (updates.enabled !== undefined) {
        updateData.enabled = updates.enabled;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      // Update webhook
      const webhook = await fastify.prisma.webhookEndpoint.update({
        where: { id },
        data: updateData,
      });

      logger.info('Webhook updated', {
        userId,
        webhookId: id,
        updatedFields: Object.keys(updateData),
      });

      // Do NOT return secret
      return reply.send({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        description: webhook.description,
        created_at: webhook.createdAt.toISOString(),
        updated_at: webhook.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error updating webhook', error);
      throw error;
    }
  });

  // DELETE /v1/webhooks/:id - Delete webhook
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      // Check webhook exists and user owns it
      const webhook = await fastify.prisma.webhookEndpoint.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!webhook) {
        throw new AppError(404, 'webhook-not-found', 'Webhook not found');
      }

      // Delete webhook (cascade deletes deliveries via Prisma schema)
      await fastify.prisma.webhookEndpoint.delete({
        where: { id },
      });

      logger.info('Webhook deleted', {
        userId,
        webhookId: id,
      });

      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error deleting webhook', error);
      throw error;
    }
  });
};

export default webhookRoutes;
