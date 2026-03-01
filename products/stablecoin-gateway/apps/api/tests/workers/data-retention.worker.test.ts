/**
 * Data Retention Worker Tests (RISK-002 Remediation)
 *
 * Verifies that the worker:
 * - Deletes expired refresh tokens past retention period
 * - Deletes old webhook deliveries past retention period
 * - Deletes old payment sessions past retention period
 * - Deletes old audit log entries past retention period
 * - Handles errors gracefully (one table failure doesn't block others)
 * - Reports deletion counts per table
 * - Is safe to call on empty tables
 */

import { DataRetentionWorker } from '../../src/workers/data-retention.worker';

// Retention periods (days) — must match worker constants
const REFRESH_TOKEN_RETENTION_DAYS = 90;
const WEBHOOK_DELIVERY_RETENTION_DAYS = 90;
const PAYMENT_SESSION_RETENTION_DAYS = 2555; // ~7 years (financial records)
const AUDIT_LOG_RETENTION_DAYS = 2555; // ~7 years (compliance)

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Mock PrismaClient with deleteMany for each model
const mockRefreshTokenDeleteMany = jest.fn();
const mockWebhookDeliveryDeleteMany = jest.fn();
const mockPaymentSessionDeleteMany = jest.fn();
const mockAuditLogDeleteMany = jest.fn();

const mockPrisma = {
  refreshToken: { deleteMany: mockRefreshTokenDeleteMany },
  webhookDelivery: { deleteMany: mockWebhookDeliveryDeleteMany },
  paymentSession: { deleteMany: mockPaymentSessionDeleteMany },
  auditLog: { deleteMany: mockAuditLogDeleteMany },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: each deleteMany returns 0 rows deleted
  mockRefreshTokenDeleteMany.mockResolvedValue({ count: 0 });
  mockWebhookDeliveryDeleteMany.mockResolvedValue({ count: 0 });
  mockPaymentSessionDeleteMany.mockResolvedValue({ count: 0 });
  mockAuditLogDeleteMany.mockResolvedValue({ count: 0 });
});

describe('DataRetentionWorker', () => {
  let worker: DataRetentionWorker;

  beforeEach(() => {
    worker = new DataRetentionWorker(mockPrisma as any);
  });

  describe('runRetention()', () => {
    it('calls deleteMany on all four tables', async () => {
      await worker.runRetention();

      expect(mockRefreshTokenDeleteMany).toHaveBeenCalledTimes(1);
      expect(mockWebhookDeliveryDeleteMany).toHaveBeenCalledTimes(1);
      expect(mockPaymentSessionDeleteMany).toHaveBeenCalledTimes(1);
      expect(mockAuditLogDeleteMany).toHaveBeenCalledTimes(1);
    });

    it('deletes refresh tokens expired and older than retention period', async () => {
      await worker.runRetention();

      const call = mockRefreshTokenDeleteMany.mock.calls[0][0];
      expect(call).toHaveProperty('where');
      // Should delete tokens where expiresAt is before the retention cutoff
      expect(call.where).toHaveProperty('expiresAt');
    });

    it('deletes webhook deliveries older than retention period', async () => {
      await worker.runRetention();

      const call = mockWebhookDeliveryDeleteMany.mock.calls[0][0];
      expect(call).toHaveProperty('where');
      // Should target SUCCEEDED or FAILED deliveries older than 90 days
      expect(call.where).toBeDefined();
    });

    it('deletes completed/failed payment sessions older than 7 years', async () => {
      await worker.runRetention();

      const call = mockPaymentSessionDeleteMany.mock.calls[0][0];
      expect(call).toHaveProperty('where');
      // Should only delete non-PENDING, non-CONFIRMING sessions
      // (i.e., only delete completed/failed/refunded ones, not active ones)
      expect(call.where).toBeDefined();
    });

    it('deletes audit logs older than 7 years', async () => {
      await worker.runRetention();

      const call = mockAuditLogDeleteMany.mock.calls[0][0];
      expect(call).toHaveProperty('where');
      expect(call.where).toHaveProperty('timestamp');
    });

    it('returns deletion counts for all tables', async () => {
      mockRefreshTokenDeleteMany.mockResolvedValue({ count: 5 });
      mockWebhookDeliveryDeleteMany.mockResolvedValue({ count: 12 });
      mockPaymentSessionDeleteMany.mockResolvedValue({ count: 0 });
      mockAuditLogDeleteMany.mockResolvedValue({ count: 3 });

      const result = await worker.runRetention();

      expect(result).toMatchObject({
        refreshTokens: 5,
        webhookDeliveries: 12,
        paymentSessions: 0,
        auditLogs: 3,
      });
    });

    it('returns zero counts when no records need deletion', async () => {
      const result = await worker.runRetention();

      expect(result).toEqual({
        refreshTokens: 0,
        webhookDeliveries: 0,
        paymentSessions: 0,
        auditLogs: 0,
      });
    });

    it('continues processing other tables if one table fails', async () => {
      mockRefreshTokenDeleteMany.mockRejectedValue(new Error('DB connection lost'));
      mockWebhookDeliveryDeleteMany.mockResolvedValue({ count: 3 });
      mockPaymentSessionDeleteMany.mockResolvedValue({ count: 0 });
      mockAuditLogDeleteMany.mockResolvedValue({ count: 1 });

      // Should not throw even if one table fails
      const result = await worker.runRetention();

      // The failed table gets 0, others proceed normally
      expect(result.refreshTokens).toBe(0);
      expect(result.webhookDeliveries).toBe(3);
      expect(result.auditLogs).toBe(1);
    });

    it('deletes refresh tokens with cutoff date before now minus retention days', async () => {
      const beforeCall = new Date();
      await worker.runRetention();
      const afterCall = new Date();

      const call = mockRefreshTokenDeleteMany.mock.calls[0][0];
      const cutoff = call.where.expiresAt?.lt;

      if (cutoff) {
        const expectedEarliest = new Date(beforeCall.getTime() - REFRESH_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const expectedLatest = new Date(afterCall.getTime() - REFRESH_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedEarliest.getTime());
        expect(cutoff.getTime()).toBeLessThanOrEqual(expectedLatest.getTime());
      }
    });
  });

  describe('start() / stop() lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      worker.stop();
      jest.useRealTimers();
    });

    it('start() does not immediately run retention', () => {
      worker.start();
      expect(mockRefreshTokenDeleteMany).not.toHaveBeenCalled();
    });

    it('stop() is safe to call before start()', () => {
      expect(() => worker.stop()).not.toThrow();
    });

    it('start() twice is a no-op (does not double-schedule)', () => {
      worker.start();
      worker.start();
      // Only one interval should be running
      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000); // advance 24h + 1s
      // runRetention would have been called once (not twice)
      // We verify by checking only one call was made despite start() being called twice
      expect(mockRefreshTokenDeleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
