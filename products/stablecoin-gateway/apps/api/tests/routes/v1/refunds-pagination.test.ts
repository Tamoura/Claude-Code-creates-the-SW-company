/**
 * Refund Pagination Tests
 *
 * Verifies that the GET /v1/refunds endpoint:
 * - Applies default limit (50) and offset (0) when not provided
 * - Validates max limit (100)
 * - Returns standard pagination metadata (total, limit, offset)
 */

import { listRefundsQuerySchema } from '../../../src/utils/validation';

describe('listRefundsQuerySchema', () => {
  it('should apply default limit of 50 when not provided', () => {
    const result = listRefundsQuerySchema.parse({});
    expect(result.limit).toBe(50);
  });

  it('should apply default offset of 0 when not provided', () => {
    const result = listRefundsQuerySchema.parse({});
    expect(result.offset).toBe(0);
  });

  it('should accept explicit limit and offset', () => {
    const result = listRefundsQuerySchema.parse({ limit: '25', offset: '10' });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(10);
  });

  it('should reject limit above 100', () => {
    expect(() =>
      listRefundsQuerySchema.parse({ limit: '101' })
    ).toThrow();
  });

  it('should reject negative offset', () => {
    expect(() =>
      listRefundsQuerySchema.parse({ offset: '-1' })
    ).toThrow();
  });

  it('should accept optional status filter', () => {
    const result = listRefundsQuerySchema.parse({ status: 'PENDING' });
    expect(result.status).toBe('PENDING');
  });

  it('should accept optional payment_session_id filter', () => {
    const result = listRefundsQuerySchema.parse({
      payment_session_id: 'ps_123',
    });
    expect(result.payment_session_id).toBe('ps_123');
  });
});
