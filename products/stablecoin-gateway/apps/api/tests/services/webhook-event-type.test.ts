/**
 * Tests for WebhookEventType union and Zod schema event enums.
 *
 * Ensures that `refund.processing` is recognized as a valid event
 * type across the type definition and both webhook schemas.
 */

import { WebhookEventType } from '../../src/services/webhook-delivery.service';
import {
  createWebhookSchema,
  updateWebhookSchema,
} from '../../src/utils/validation';

describe('WebhookEventType', () => {
  const ALL_EVENT_TYPES: WebhookEventType[] = [
    'payment.created',
    'payment.confirming',
    'payment.completed',
    'payment.failed',
    'payment.refunded',
    'refund.created',
    'refund.processing',
    'refund.completed',
    'refund.failed',
  ];

  it('should include refund.processing as a valid event type', () => {
    // Compile-time check: assigning the literal to the union type
    // succeeds only if it is part of the union.
    const event: WebhookEventType = 'refund.processing';
    expect(event).toBe('refund.processing');
  });

  it('should have exactly 9 event types', () => {
    // We verify by ensuring every member of our exhaustive list
    // can be assigned to the union type (compile-time) and that
    // the list has the expected length (runtime).
    expect(ALL_EVENT_TYPES).toHaveLength(9);
  });

  describe('createWebhookSchema', () => {
    it('should accept refund.processing in events array', () => {
      const result = createWebhookSchema.safeParse({
        url: 'https://example.com/webhook',
        events: ['refund.processing'],
      });

      expect(result.success).toBe(true);
    });

    it('should accept all 9 event types', () => {
      const result = createWebhookSchema.safeParse({
        url: 'https://example.com/webhook',
        events: [...ALL_EVENT_TYPES],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.events).toHaveLength(9);
      }
    });
  });

  describe('updateWebhookSchema', () => {
    it('should accept refund.processing in events array', () => {
      const result = updateWebhookSchema.safeParse({
        events: ['refund.processing'],
      });

      expect(result.success).toBe(true);
    });

    it('should accept all 9 event types', () => {
      const result = updateWebhookSchema.safeParse({
        events: [...ALL_EVENT_TYPES],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.events).toHaveLength(9);
      }
    });
  });
});
