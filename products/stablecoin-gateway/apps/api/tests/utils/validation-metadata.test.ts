import { describe, it, expect } from '@jest/globals';
import { createPaymentSessionSchema } from '../../src/utils/validation.js';

describe('Metadata Validation', () => {
  describe('Size Limits', () => {
    const validPaymentData = {
      amount: 100,
      currency: 'USD' as const,
      network: 'polygon' as const,
      token: 'USDC' as const,
      merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
    };

    it('should accept metadata with 50 keys or fewer', () => {
      const metadata: Record<string, string> = {};
      for (let i = 1; i <= 50; i++) {
        metadata[`key${i}`] = 'value';
      }

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(true);
    });

    it('should reject metadata with more than 50 keys', () => {
      const metadata: Record<string, string> = {};
      for (let i = 1; i <= 51; i++) {
        metadata[`key${i}`] = 'value';
      }

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('50 keys');
      }
    });

    it('should accept metadata values up to 500 characters', () => {
      const metadata = {
        key1: 'A'.repeat(500),
      };

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(true);
    });

    it('should reject metadata values exceeding 500 characters', () => {
      const metadata = {
        key1: 'A'.repeat(501),
      };

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('500 characters');
      }
    });

    it('should accept metadata up to 16KB total size', () => {
      // Create metadata that's close to 16KB but within limits
      // Use 40 keys (under 50 limit) with 390 char values (under 500 limit)
      const metadata: Record<string, string> = {};
      for (let i = 1; i <= 40; i++) {
        metadata[`key${i}`] = 'A'.repeat(390); // Should be under 16KB
      }

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(true);
    });

    it('should reject metadata exceeding 16KB total size', () => {
      // Use multiple keys with 500 char values to exceed 16KB
      // 35 keys * 500 chars = 17500 bytes > 16KB
      const metadata: Record<string, string> = {};
      for (let i = 1; i <= 35; i++) {
        metadata[`key${i}`] = 'A'.repeat(500);
      }

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('16KB');
      }
    });

    it('should accept metadata with numbers, booleans, and null', () => {
      const metadata = {
        count: 42,
        enabled: true,
        disabled: false,
        empty: null,
      };

      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata,
      });

      expect(result.success).toBe(true);
    });

    it('should accept undefined/missing metadata', () => {
      const result = createPaymentSessionSchema.safeParse(validPaymentData);

      expect(result.success).toBe(true);
    });

    it('should accept empty metadata object', () => {
      const result = createPaymentSessionSchema.safeParse({
        ...validPaymentData,
        metadata: {},
      });

      expect(result.success).toBe(true);
    });
  });
});
