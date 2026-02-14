/**
 * Webhook CRUD Routes
 *
 * Create, list, get, update, delete webhook endpoints + secret rotation.
 * Requires authentication and write permission.
 */

import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { logger } from '@connectsw/shared';
import { validateWebhookUrl } from '../utils/url-validator.js';
import { encryptSecretForStorage } from '../utils/encryption.js';
import crypto from 'crypto';

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  enabled: z.boolean().optional().default(true),
  description: z.string().max(500).optional(),
});

const updateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

interface WebhookEndpointRecord {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function formatResponse(wh: WebhookEndpointRecord, secret?: string) {
  const res: Record<string, unknown> = {
    id: wh.id,
    url: wh.url,
    events: wh.events,
    enabled: wh.enabled,
    description: wh.description,
    created_at: wh.createdAt.toISOString(),
    updated_at: wh.updatedAt.toISOString(),
  };
  if (secret) res.secret = secret;
  return res;
}

export interface WebhookRoutesOptions {
  /** Valid event names for validation. If provided, events are validated against this list. */
  validEvents?: string[];
}

const webhookRoutes: FastifyPluginAsync<WebhookRoutesOptions> = async (fastify, opts) => {
  const { validEvents } = opts;

  // POST /
  fastify.post('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const body = createSchema.parse(request.body);
      if (validEvents) {
        const invalid = body.events.filter((e) => !validEvents.includes(e));
        if (invalid.length) return reply.code(400).send({ status: 400, detail: `Invalid events: ${invalid.join(', ')}` });
      }

      await validateWebhookUrl(body.url);
      const secret = generateWebhookSecret();
      const secretToStore = encryptSecretForStorage(secret);

      const webhook = await fastify.prisma.webhookEndpoint.create({
        data: {
          userId: request.currentUser!.id,
          url: body.url,
          secret: secretToStore,
          events: body.events,
          enabled: body.enabled,
          description: body.description,
        },
      });

      logger.info('Webhook created', { userId: request.currentUser!.id, webhookId: webhook.id });
      return reply.code(201).send(formatResponse(webhook, secret));
    } catch (error) {
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      if (error instanceof Error && error.message.includes('URL')) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // GET /
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    const q = listSchema.parse(request.query);
    const userId = request.currentUser!.id;

    const [webhooks, total] = await Promise.all([
      fastify.prisma.webhookEndpoint.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: q.limit, skip: q.offset }),
      fastify.prisma.webhookEndpoint.count({ where: { userId } }),
    ]);

    return reply.send({
      data: webhooks.map((w: WebhookEndpointRecord) => formatResponse(w)),
      pagination: { limit: q.limit, offset: q.offset, total, has_more: q.offset + q.limit < total },
    });
  });

  // GET /:id
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const webhook = await fastify.prisma.webhookEndpoint.findFirst({ where: { id, userId: request.currentUser!.id } });
    if (!webhook) return reply.code(404).send({ status: 404, detail: 'Webhook not found' });
    return reply.send(formatResponse(webhook));
  });

  // PATCH /:id
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = updateSchema.parse(request.body);
      const existing = await fastify.prisma.webhookEndpoint.findFirst({ where: { id, userId: request.currentUser!.id } });
      if (!existing) return reply.code(404).send({ status: 404, detail: 'Webhook not found' });

      const data: Record<string, unknown> = {};
      if (updates.url !== undefined) { await validateWebhookUrl(updates.url); data.url = updates.url; }
      if (updates.events !== undefined) data.events = updates.events;
      if (updates.enabled !== undefined) data.enabled = updates.enabled;
      if (updates.description !== undefined) data.description = updates.description;

      const webhook = await fastify.prisma.webhookEndpoint.update({ where: { id }, data });
      logger.info('Webhook updated', { webhookId: id, fields: Object.keys(data) });
      return reply.send(formatResponse(webhook));
    } catch (error) {
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      if (error instanceof Error && error.message.includes('URL')) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // DELETE /:id
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const webhook = await fastify.prisma.webhookEndpoint.findFirst({ where: { id, userId: request.currentUser!.id } });
    if (!webhook) return reply.code(404).send({ status: 404, detail: 'Webhook not found' });
    await fastify.prisma.webhookEndpoint.delete({ where: { id } });
    logger.info('Webhook deleted', { webhookId: id });
    return reply.code(204).send();
  });

  // POST /:id/rotate-secret
  fastify.post('/:id/rotate-secret', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const webhook = await fastify.prisma.webhookEndpoint.findFirst({ where: { id, userId: request.currentUser!.id } });
    if (!webhook) return reply.code(404).send({ status: 404, detail: 'Webhook not found' });

    const newSecret = generateWebhookSecret();
    const secretToStore = encryptSecretForStorage(newSecret);
    await fastify.prisma.webhookEndpoint.update({ where: { id }, data: { secret: secretToStore } });

    logger.info('Webhook secret rotated', { webhookId: id });
    return reply.send({ id, secret: newSecret, rotated_at: new Date().toISOString() });
  });
};

export default webhookRoutes;
