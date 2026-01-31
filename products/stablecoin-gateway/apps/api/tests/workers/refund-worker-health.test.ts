/**
 * Refund Worker Health Check Tests
 *
 * Verifies heartbeat tracking and health status reporting
 * for the refund processing worker.
 */

import { RefundProcessingWorker } from '../../src/workers/refund-processing.worker';

describe('RefundProcessingWorker - Health Status', () => {
  it('should expose a getHealthStatus() method', () => {
    const mockPrisma = {} as any;
    const mockRefundService = {} as any;

    const worker = new RefundProcessingWorker(mockPrisma, mockRefundService);
    expect(typeof worker.getHealthStatus).toBe('function');
  });

  it('should report idle status before starting', () => {
    const mockPrisma = {} as any;
    const mockRefundService = {} as any;

    const worker = new RefundProcessingWorker(mockPrisma, mockRefundService);
    const status = worker.getHealthStatus();

    expect(status.running).toBe(false);
    expect(status.lastHeartbeat).toBeNull();
    expect(status.isStale).toBe(false);
  });

  it('should track heartbeat after processing', async () => {
    const mockPrisma = {
      refund: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const mockRefundService = {} as any;

    const worker = new RefundProcessingWorker(mockPrisma, mockRefundService);

    // Call processPendingRefunds directly (no Redis = unlocked path)
    await worker.processPendingRefunds();

    const status = worker.getHealthStatus();
    expect(status.lastHeartbeat).toBeInstanceOf(Date);
    expect(status.isStale).toBe(false);
  });

  it('should detect stale heartbeat', async () => {
    const mockPrisma = {
      refund: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const mockRefundService = {} as any;

    const worker = new RefundProcessingWorker(mockPrisma, mockRefundService);

    // Simulate a heartbeat that happened long ago
    await worker.processPendingRefunds();

    // Override the heartbeat to be stale (90 seconds ago)
    (worker as any).lastHeartbeat = new Date(Date.now() - 90_000);

    const status = worker.getHealthStatus();
    expect(status.isStale).toBe(true);
  });

  it('should report running=true after start()', () => {
    const mockPrisma = {} as any;
    const mockRefundService = {} as any;

    const worker = new RefundProcessingWorker(mockPrisma, mockRefundService);
    worker.start();

    const status = worker.getHealthStatus();
    expect(status.running).toBe(true);

    worker.stop();
    expect(worker.getHealthStatus().running).toBe(false);
  });
});
