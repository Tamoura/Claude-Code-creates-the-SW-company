/**
 * Webhook CRUD API Routes
 *
 * Provides complete webhook management functionality:
 * - Create webhook endpoints with auto-generated secrets
 * - List all user webhooks
 * - Get individual webhook details
 * - Update webhook configuration
 * - Delete webhook endpoints
 * - Rotate webhook secrets (without losing delivery history)
 *
 * Security:
 * - All endpoints require authentication (JWT or API key)
 * - Webhook secrets encrypted at rest (AES-256-GCM) when key is configured
 * - In production, encryption is mandatory (no plaintext fallback)
 * - Secrets only shown once during creation or rotation
 * - HTTPS-only URLs enforced
 * - Ownership verified on all operations
 */

import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { createWebhookSchema, updateWebhookSchema, listWebhooksQuerySchema, validateBody, validateQuery } from '../../utils/validation.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { validateWebhookUrl } from '../../utils/url-validator.js';
import { encryptSecret } from '../../utils/encryption.js';
import crypto from 'crypto';

/**
 * Generate a webhook secret with whsec_ prefix (Stripe-style)
 *
 * Format: whsec_[64 hex characters]
 * Provides 256 bits of entropy for HMAC-SHA256 signatures
 */
function generateWebhookSecret(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `whsec_${randomBytes}`;
}

/**
 * Enforce webhook secret encryption in production.
 *
 * In production, WEBHOOK_ENCRYPTION_KEY must be set. Plaintext
 * storage of webhook secrets is only permitted in development
 * and test environments.
 *
 * @throws {AppError} 500 if production and no encryption key
 */
function requireEncryptionInProduction(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.WEBHOOK_ENCRYPTION_KEY
  ) {
    throw new AppError(
      500,
      'encryption-required',
      'Webhook encryption key is required in production'
    );
  }
}

/**
 * Encrypt a webhook secret for storage.
 *
 * - Production: always encrypted (enforced by requireEncryptionInProduction)
 * - Dev/test with key: encrypted
 * - Dev/test without key: plaintext fallback
 */
function encryptSecretForStorage(secret: string): string {
  requireEncryptionInProduction();

  return process.env.WEBHOOK_ENCRYPTION_KEY
    ? encryptSecret(secret)
    : secret;
}

/**
 * SECURITY NOTE: Webhook Secrets Storage
 *
 * Unlike passwords and API keys, webhook secrets must be recoverable for HMAC signing.
 *
 * Storage approach:
 * - Passwords: Never need to be recovered -> one-way hash (bcrypt)
 * - API keys: Verify incoming requests -> one-way hash (SHA-256) + compare
 * - Webhook secrets: Sign outgoing payloads -> must be recoverable
 *
 * We use AES-256-GCM encryption at rest for webhook secrets:
 * - Production: encryption is MANDATORY (WEBHOOK_ENCRYPTION_KEY required)
 * - Dev/test: plaintext fallback if key not set (backwards compatible)
 *
 * Why encryption (not hashing)?
 * We need the plaintext secret to compute HMAC-SHA256 signatures when sending
 * webhooks to merchant endpoints. One-way hashing would make signing impossible.
 *
 * Industry standard: Stripe, GitHub, and other webhook providers all store
 * webhook secrets in a recoverable format (encrypted at rest or plaintext).
 */

/**
 * Format webhook response (exclude secret from output)
 */
interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  secret?: string; // Only included on creation
}

/**
 * Transform webhook database record to API response
 * SECURITY: Excludes secret by default
 */
function formatWebhookResponse(
  webhook: any,
  includeSecret?: { secret: string }
): WebhookResponse {
  const response: WebhookResponse = {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    enabled: webhook.enabled,
    description: webhook.description,
    created_at: webhook.createdAt.toISOString(),
    updated_at: webhook.updatedAt.toISOString(),
  };

  if (includeSecret) {
    response.secret = includeSecret.secret;
  }

  return response;
}

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/webhooks - Create webhook
  fastify.post('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const body = validateBody(createWebhookSchema, request.body);
      const userId = request.currentUser!.id;

      // Validate webhook URL for SSRF protection (with DNS resolution)
      await validateWebhookUrl(body.url);

      // Generate webhook secret
      const secret = generateWebhookSecret();

      // Encrypt secret for storage (enforces encryption in production)
      const secretToStore = encryptSecretForStorage(secret);

      // Create webhook endpoint
      const webhook = await fastify.prisma.webhookEndpoint.create({
        data: {
          userId,
          url: body.url,
          secret: secretToStore, // Encrypted (if key available) or plaintext
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
      return reply.code(201).send(formatWebhookResponse(webhook, { secret }));
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

  // GET /v1/webhooks - List all webhooks (paginated)
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    try {
      const query = validateQuery(listWebhooksQuerySchema, request.query);
      const userId = request.currentUser!.id;

      const [webhooks, total] = await Promise.all([
        fastify.prisma.webhookEndpoint.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        fastify.prisma.webhookEndpoint.count({
          where: { userId },
        }),
      ]);

      // Do NOT return secrets in list
      return reply.send({
        data: webhooks.map(webhook => formatWebhookResponse(webhook)),
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total,
          has_more: (query.offset ?? 0) + (query.limit ?? 20) < total,
        },
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
      return reply.send(formatWebhookResponse(webhook));
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
      const updateData: Prisma.WebhookEndpointUpdateInput = {};
      if (updates.url !== undefined) {
        // Validate new URL for SSRF protection (with DNS resolution)
        await validateWebhookUrl(updates.url);
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
      return reply.send(formatWebhookResponse(webhook));
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

  // POST /v1/webhooks/:id/rotate-secret - Rotate webhook secret
  fastify.post('/:id/rotate-secret', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      // Verify webhook exists and user owns it
      const webhook = await fastify.prisma.webhookEndpoint.findFirst({
        where: {
          id,
          userId, // Enforce ownership
        },
      });

      if (!webhook) {
        throw new AppError(404, 'webhook-not-found', 'Webhook not found');
      }

      // Generate new cryptographically secure secret
      const newSecret = generateWebhookSecret();

      // Encrypt secret for storage (enforces encryption in production)
      const secretToStore = encryptSecretForStorage(newSecret);

      // Update the webhook with the new secret
      await fastify.prisma.webhookEndpoint.update({
        where: { id },
        data: {
          secret: secretToStore,
          updatedAt: new Date(),
        },
      });

      logger.info('Webhook secret rotated', {
        userId,
        webhookId: id,
      });

      // Return new secret in plaintext (ONLY TIME IT'S SHOWN)
      return reply.send({
        id,
        secret: newSecret,
        rotatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error rotating webhook secret', error);
      throw error;
    }
  });
};

export default webhookRoutes;
