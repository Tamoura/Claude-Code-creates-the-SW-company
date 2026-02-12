import { describe, it, expect } from '@jest/globals';
import { validateBody, signupSchema, eventSchema, createTenantSchema, recommendationQuerySchema } from '../../src/utils/validation';
import { ValidationError, BadRequestError } from '../../src/utils/errors';

describe('Validation', () => {
  describe('signupSchema', () => {
    it('should accept valid signup data', () => {
      const result = validateBody(signupSchema, { email: 'test@example.com', password: 'securepass123' });
      expect(result.email).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      expect(() => validateBody(signupSchema, { email: 'not-email', password: 'securepass123' }))
        .toThrow(ValidationError);
    });

    it('should reject short password', () => {
      expect(() => validateBody(signupSchema, { email: 'test@example.com', password: 'short' }))
        .toThrow(ValidationError);
    });

    it('should reject missing fields', () => {
      expect(() => validateBody(signupSchema, {})).toThrow(ValidationError);
    });
  });

  describe('eventSchema', () => {
    it('should accept valid event', () => {
      const result = validateBody(eventSchema, {
        eventType: 'product_viewed',
        userId: 'user-123',
        productId: 'prod-456',
      });
      expect(result.eventType).toBe('product_viewed');
    });

    it('should accept event with optional fields', () => {
      const result = validateBody(eventSchema, {
        eventType: 'purchase',
        userId: 'user-123',
        productId: 'prod-456',
        sessionId: 'sess-789',
        metadata: { price: 29.99, currency: 'USD' },
      });
      expect(result.sessionId).toBe('sess-789');
    });

    it('should reject invalid event type', () => {
      expect(() => validateBody(eventSchema, {
        eventType: 'invalid_type',
        userId: 'user-123',
        productId: 'prod-456',
      })).toThrow(ValidationError);
    });

    it('should reject empty userId', () => {
      expect(() => validateBody(eventSchema, {
        eventType: 'product_viewed',
        userId: '',
        productId: 'prod-456',
      })).toThrow(ValidationError);
    });
  });

  describe('createTenantSchema', () => {
    it('should accept valid tenant', () => {
      const result = validateBody(createTenantSchema, { name: 'Acme Store' });
      expect(result.name).toBe('Acme Store');
    });

    it('should accept tenant with config', () => {
      const result = validateBody(createTenantSchema, {
        name: 'Acme Store',
        config: { defaultStrategy: 'collaborative', excludePurchased: true },
      });
      expect(result.config?.defaultStrategy).toBe('collaborative');
    });

    it('should reject empty name', () => {
      expect(() => validateBody(createTenantSchema, { name: '' })).toThrow(ValidationError);
    });
  });
});
