/**
 * OpenAPI Schemas — Notification Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

const NotificationPreferenceResponse = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    emailOnPaymentReceived: { type: 'boolean' as const },
    emailOnRefundProcessed: { type: 'boolean' as const },
    emailOnPaymentFailed: { type: 'boolean' as const },
    sendCustomerReceipt: { type: 'boolean' as const },
    createdAt: { type: 'string' as const, format: 'date-time' },
    updatedAt: { type: 'string' as const, format: 'date-time' },
  },
  additionalProperties: true,
};

export const getNotificationPrefsRouteSchema: RouteSchema = {
  tags: ['notifications'],
  summary: 'Get notification preferences',
  description: 'Auto-creates preferences with defaults on first access.',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  response: {
    200: { description: 'Current notification preferences', ...NotificationPreferenceResponse },
  },
};

export const updateNotificationPrefsRouteSchema: RouteSchema = {
  tags: ['notifications'],
  summary: 'Update notification preferences',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  body: {
    type: 'object' as const,
    properties: {
      emailOnPaymentReceived: { type: 'boolean' as const },
      emailOnRefundProcessed: { type: 'boolean' as const },
      emailOnPaymentFailed: { type: 'boolean' as const },
      sendCustomerReceipt: { type: 'boolean' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: { description: 'Updated notification preferences', ...NotificationPreferenceResponse },
    400: ErrorRef,
  },
};
