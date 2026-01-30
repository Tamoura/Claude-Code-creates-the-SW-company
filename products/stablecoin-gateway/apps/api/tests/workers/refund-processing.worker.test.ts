/**
 * Refund Processing Worker Tests
 *
 * Verifies that the worker:
 * - Finds PENDING refunds and calls processRefund for each
 * - Handles errors gracefully (one failure doesn't block others)
 * - Limits batch size to 10 per run
 * - Skips processing when no pending refunds exist
 * - Provides start/stop lifecycle via setInterval
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

describe('RefundProcessingWorker', () => {
  let worker: RefundProcessingWorker;
  let mockPrisma: any;
  let mockRefundService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPrisma = new PrismaClient();
    mockRefundService = new RefundService(mockPrisma);
    worker = new RefundProcessingWorker(mockPrisma, mockRefundService);
  });

  afterEach(() => {
    worker.stop();
    jest.useRealTimers();
  });

  describe('processPendingRefunds', () => {
    it('should find PENDING refunds and call processRefund for each', async () => {
      const pendingRefunds = [
        { id: 'ref_1', status: 'PENDING', createdAt: new Date('2025-01-01') },
        { id: 'ref_2', status: 'PENDING', createdAt: new Date('2025-01-02') },
        { id: 'ref_3', status: 'PENDING', createdAt: new Date('2025-01-03') },
      ];

      mockPrisma.refund.findMany.mockResolvedValue(pendingRefunds);
      mockRefundService.processRefund.mockResolvedValue({});

      await worker.processPendingRefunds();

      expect(mockPrisma.refund.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      expect(mockRefundService.processRefund).toHaveBeenCalledTimes(3);
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_1');
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_2');
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_3');
    });

    it('should handle errors gracefully so one failure does not block others', async () => {
      const pendingRefunds = [
        { id: 'ref_ok_1', status: 'PENDING', createdAt: new Date('2025-01-01') },
        { id: 'ref_fail', status: 'PENDING', createdAt: new Date('2025-01-02') },
        { id: 'ref_ok_2', status: 'PENDING', createdAt: new Date('2025-01-03') },
      ];

      mockPrisma.refund.findMany.mockResolvedValue(pendingRefunds);
      mockRefundService.processRefund
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Blockchain timeout'))
        .mockResolvedValueOnce({});

      await worker.processPendingRefunds();

      // All three should have been attempted
      expect(mockRefundService.processRefund).toHaveBeenCalledTimes(3);
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_ok_1');
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_fail');
      expect(mockRefundService.processRefund).toHaveBeenCalledWith('ref_ok_2');
    });

    it('should limit batch size to 10 per run', async () => {
      mockPrisma.refund.findMany.mockResolvedValue([]);

      await worker.processPendingRefunds();

      expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should skip processing if no pending refunds exist', async () => {
      mockPrisma.refund.findMany.mockResolvedValue([]);

      await worker.processPendingRefunds();

      expect(mockRefundService.processRefund).not.toHaveBeenCalled();
    });
  });

  describe('start and stop lifecycle', () => {
    it('should start an interval that calls processPendingRefunds', async () => {
      mockPrisma.refund.findMany.mockResolvedValue([]);

      worker.start();

      // Advance by 30 seconds (the interval)
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // flush microtasks

      expect(mockPrisma.refund.findMany).toHaveBeenCalled();
    });

    it('should stop the interval when stop is called', () => {
      mockPrisma.refund.findMany.mockResolvedValue([]);

      worker.start();
      worker.stop();

      jest.advanceTimersByTime(60000);

      // After stop, no calls should have been made
      expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
    });

    it('should not start multiple intervals if start is called twice', () => {
      mockPrisma.refund.findMany.mockResolvedValue([]);
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      worker.start();
      worker.start(); // second call should be a no-op

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });
  });
});
