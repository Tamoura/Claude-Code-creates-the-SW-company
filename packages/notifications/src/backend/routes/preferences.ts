/**
 * Notification Preferences Routes
 *
 * GET/PATCH endpoints for managing user notification preferences.
 * Auto-creates defaults on first access.
 */

import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { logger } from '@connectsw/shared';
import { EmailService } from '../services/email.service.js';

export interface PreferencesRoutesOptions {
  /** Zod schema for preference updates. If not provided, accepts any boolean fields. */
  updateSchema?: z.ZodSchema;
  /** SMTP config for email service */
  smtp?: { host: string; port: number; user: string; pass: string; from?: string };
}

const defaultUpdateSchema = z.record(z.boolean()).refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'At least one preference must be provided' },
);

const preferencesRoutes: FastifyPluginAsync<PreferencesRoutesOptions> = async (fastify, opts) => {
  const schema = opts.updateSchema ?? defaultUpdateSchema;
  const emailService = new EmailService(fastify.prisma, opts.smtp ? { smtp: opts.smtp } : undefined);

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /preferences
  fastify.get('/preferences', async (request, reply) => {
    const prefs = await emailService.getNotificationPreferences(request.currentUser!.id);
    return reply.send(prefs);
  });

  // PATCH /preferences
  fastify.patch('/preferences', async (request, reply) => {
    try {
      const updates = schema.parse(request.body);
      const prefs = await emailService.updateNotificationPreferences(request.currentUser!.id, updates);
      logger.info('Notification preferences updated', { userId: request.currentUser!.id });
      return reply.send(prefs);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ status: 400, detail: error.message });
      }
      throw error;
    }
  });
};

export default preferencesRoutes;
