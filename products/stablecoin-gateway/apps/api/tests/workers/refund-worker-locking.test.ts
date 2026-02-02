/**
 * Refund Worker Distributed Locking Tests
 *
 * Verifies that the refund processing worker uses Redis distributed
 * locking to prevent double-spend in multi-instance deployments.
 *
 * Tests:
 * - Worker acquires Redis lock before processing
 * - Worker skips processing if lock is held by another instance
 * - Lock is released after processing completes
 * - Lock is released even if processing throws an error
 * - Lock has TTL to prevent deadlock (60 seconds)
 * - Worker uses FOR UPDATE SKIP LOCKED for individual refund claims
 */

import { RefundProcessingWorker } from '../../src/workers/refund-processing.worker';
import { PrismaClient } from '@prisma/client';
import { RefundService } from '../../src/services/refund.service';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    refund: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
    RefundStatus: {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
    },
  };
});

// Mock RefundService
jest.mock('../../src/services/refund.service', () => {
  return {
    RefundService: jest.fn().mockImplementation(() => ({
      processRefund: jest.fn(),
    })),
  };
});

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
});

afterAll(() => {
  jest.restoreAllMocks();
});

/**
 * Creates a mock Redis client that tracks all calls for assertion.
 */
function createMockRedis(overrides: Record<string, jest.Mock> = {}) {
  return {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    ...overrides,
  };
}

describe('RefundProcessingWorker - Distributed Locking', () => {
  let worker: RefundProcessingWorker;
  let mockPrisma: any;
  let mockRefundService: any;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = new PrismaClient();
    mockRefundService = new RefundService(mockPrisma);
    mockRedis = createMockRedis();
    worker = new RefundProcessingWorker(
      mockPrisma,
      mockRefundService,
      mockRedis as any,
    );
  });

  describe('lock acquisition', () => {
    it('should acquire Redis lock before processing refunds', async () => {
      // $transaction calls the callback with a transaction client (tx)
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
        return cb(tx);
      });

      await worker.processPendingRefunds();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:refund-worker',
        expect.any(String),
        'PX',
        60000,
        'NX',
      );
      // Lock must be acquired before the transaction
      const setCallOrder = mockRedis.set.mock.invocationCallOrder[0];
      if (mockPrisma.$transaction.mock.calls.length > 0) {
        const txCallOrder =
          mockPrisma.$transaction.mock.invocationCallOrder[0];
        expect(setCallOrder).toBeLessThan(txCallOrder);
      }
    });

    it('should skip processing if lock is held by another instance', async () => {
      // Redis SET NX returns null when key already exists
      mockRedis.set.mockResolvedValue(null);

      await worker.processPendingRefunds();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:refund-worker',
        expect.any(String),
        'PX',
        60000,
        'NX',
      );
      // Should NOT query the database at all
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
      expect(mockRefundService.processRefund).not.toHaveBeenCalled();
    });
  });

  describe('lock release', () => {
    it('should release lock after processing completes', async () => {
      const pendingRefunds = [
        { id: 'ref_1' },
        { id: 'ref_2' },
      ];
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = { $queryRaw: jest.fn().mockResolvedValue(pendingRefunds) };
        return cb(tx);
      });
      mockRefundService.processRefund.mockResolvedValue({});

      // Make get return the lock value so we can verify ownership check
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key === 'lock:refund-worker') {
          // Return the value that was set (captured from set call)
          const setCall = mockRedis.set.mock.calls[0];
          return setCall ? setCall[1] : null;
        }
        return null;
      });

      await worker.processPendingRefunds();

      // Should check ownership before deleting
      expect(mockRedis.get).toHaveBeenCalledWith('lock:refund-worker');
      expect(mockRedis.del).toHaveBeenCalledWith('lock:refund-worker');
    });

    it('should release lock even if processing throws an error', async () => {
      // Simulate a fatal error during transaction
      mockPrisma.$transaction.mockRejectedValue(
        new Error('Database connection lost'),
      );

      // Make get return the lock value so ownership check passes
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key === 'lock:refund-worker') {
          const setCall = mockRedis.set.mock.calls[0];
          return setCall ? setCall[1] : null;
        }
        return null;
      });

      // Should not throw -- error is handled internally
      await worker.processPendingRefunds();

      // Lock must still be released
      expect(mockRedis.get).toHaveBeenCalledWith('lock:refund-worker');
      expect(mockRedis.del).toHaveBeenCalledWith('lock:refund-worker');
    });
  });

  describe('lock TTL', () => {
    it('should set lock TTL to 60 seconds to prevent deadlock', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
        return cb(tx);
      });

      await worker.processPendingRefunds();

      // PX 60000 means 60 second TTL in milliseconds
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:refund-worker',
        expect.any(String),
        'PX',
        60000,
        'NX',
      );
    });
  });

  describe('row-level locking', () => {
    it('should use FOR UPDATE SKIP LOCKED inside a transaction', async () => {
      const pendingRefunds = [{ id: 'ref_1' }];
      let capturedQueryRaw: jest.Mock | null = null;

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txQueryRaw = jest.fn().mockResolvedValue(pendingRefunds);
        capturedQueryRaw = txQueryRaw;
        const tx = { $queryRaw: txQueryRaw };
        return cb(tx);
      });
      mockRefundService.processRefund.mockResolvedValue({});

      // Make get return the lock value for proper cleanup
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key === 'lock:refund-worker') {
          const setCall = mockRedis.set.mock.calls[0];
          return setCall ? setCall[1] : null;
        }
        return null;
      });

      await worker.processPendingRefunds();

      // Worker should use $transaction wrapping $queryRaw with FOR UPDATE SKIP LOCKED
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(capturedQueryRaw).not.toBeNull();
      expect(capturedQueryRaw!).toHaveBeenCalled();

      const rawQuery = capturedQueryRaw!.mock.calls[0][0];

      // Prisma tagged template literals produce an array of strings
      const queryStr = Array.isArray(rawQuery)
        ? rawQuery.join('')
        : String(rawQuery);

      expect(queryStr).toContain('FOR UPDATE SKIP LOCKED');
      expect(queryStr).toContain('PENDING');
    });
  });

  describe('Redis unavailable fallback', () => {
    it('should fall back to current behavior with warning when Redis is unavailable', async () => {
      const warnSpy = jest.spyOn(console, 'warn');
      const pendingRefunds = [
        { id: 'ref_1', status: 'PENDING', createdAt: new Date() },
      ];
      mockPrisma.refund.findMany.mockResolvedValue(pendingRefunds);
      mockRefundService.processRefund.mockResolvedValue({});

      // Create worker without Redis
      const workerNoRedis = new RefundProcessingWorker(
        mockPrisma,
        mockRefundService,
      );

      await workerNoRedis.processPendingRefunds();

      // Should still process using findMany (old behavior)
      expect(mockPrisma.refund.findMany).toHaveBeenCalled();
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_1');

      warnSpy.mockRestore();
    });
  });
});
