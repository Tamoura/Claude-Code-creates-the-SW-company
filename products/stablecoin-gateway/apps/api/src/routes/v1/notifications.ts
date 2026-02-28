/**
 * Notification Preferences API Routes
 *
 * Provides endpoints for managing user notification preferences.
 *
 * Endpoints:
 * - GET /v1/notifications/preferences - Get current user's notification preferences
 * - PATCH /v1/notifications/preferences - Update notification preferences
 *
 * Security:
 * - All endpoints require authentication (JWT or API key)
 * - Users can only access/modify their own preferences
 * - Preferences auto-created with defaults on first access
 *
 * Design:
 * - Simple CRUD on NotificationPreference model
 * - Validation via Zod schemas
 * - Standard error handling with AppError
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { EmailService } from '../../services/email.service.js';
import { logger } from '../../utils/logger.js';
import { validateBody } from '../../utils/validation.js';
import {
  getNotificationPrefsRouteSchema, updateNotificationPrefsRouteSchema,
} from '../../schemas/notifications.js';

/**
 * Validation schema for updating notification preferences
 *
 * All fields are optional - only provided fields will be updated.
 */
const updatePreferencesSchema = z.object({
  emailOnPaymentReceived: z.boolean().optional(),
  emailOnRefundProcessed: z.boolean().optional(),
  emailOnPaymentFailed: z.boolean().optional(),
  sendCustomerReceipt: z.boolean().optional(),
});

/**
 * Format notification preference response
 */
interface NotificationPreferenceResponse {
  id: string;
  emailOnPaymentReceived: boolean;
  emailOnRefundProcessed: boolean;
  emailOnPaymentFailed: boolean;
  sendCustomerReceipt: boolean;
  createdAt: string;
  updatedAt: string;
}

function formatPreferenceResponse(prefs: {
  id: string;
  emailOnPaymentReceived: boolean;
  emailOnRefundProcessed: boolean;
  emailOnPaymentFailed: boolean;
  sendCustomerReceipt: boolean;
  createdAt: Date;
  updatedAt: Date;
}): NotificationPreferenceResponse {
  return {
    id: prefs.id,
    emailOnPaymentReceived: prefs.emailOnPaymentReceived,
    emailOnRefundProcessed: prefs.emailOnRefundProcessed,
    emailOnPaymentFailed: prefs.emailOnPaymentFailed,
    sendCustomerReceipt: prefs.sendCustomerReceipt,
    createdAt: prefs.createdAt.toISOString(),
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const emailService = new EmailService(fastify.prisma);

  /**
   * GET /v1/notifications/preferences
   *
   * Get current user's notification preferences.
   * Auto-creates preferences with defaults if none exist.
   *
   * Auth: Required (JWT or API key)
   * Permissions: read
   */
  fastify.get('/preferences', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
    schema: getNotificationPrefsRouteSchema,
  }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;

      const prefs = await emailService.getNotificationPreferences(userId);

      logger.info('Notification preferences retrieved', {
        userId,
        prefsId: prefs.id,
      });

      return reply.send(formatPreferenceResponse(prefs));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error retrieving notification preferences', error);
      throw error;
    }
  });

  /**
   * PATCH /v1/notifications/preferences
   *
   * Update current user's notification preferences.
   * Only provided fields are updated, others remain unchanged.
   *
   * Auth: Required (JWT or API key)
   * Permissions: write
   *
   * Request body:
   * {
   *   emailOnPaymentReceived?: boolean,
   *   emailOnRefundProcessed?: boolean,
   *   emailOnPaymentFailed?: boolean,
   *   sendCustomerReceipt?: boolean
   * }
   */
  fastify.patch('/preferences', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
    schema: updateNotificationPrefsRouteSchema,
  }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const updates = validateBody(updatePreferencesSchema, request.body);

      const prefs = await emailService.updateNotificationPreferences(userId, updates);

      logger.info('Notification preferences updated', {
        userId,
        prefsId: prefs.id,
        updatedFields: Object.keys(updates),
      });

      return reply.send(formatPreferenceResponse(prefs));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error updating notification preferences', error);
      throw error;
    }
  });
};

export default notificationRoutes;
