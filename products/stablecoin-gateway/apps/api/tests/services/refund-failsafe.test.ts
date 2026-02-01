/**
 * Refund Service Failsafe Tests
 *
 * Tests the fail-fast behavior for production environments
 * when blockchain service is unavailable, while allowing
 * graceful degradation in dev/test environments.
 *
 * FIX-PHASE2-10: Fix Refund Service Silent Failures
 */

import { PrismaClient } from '@prisma/client';

// Store original env to restore after tests
const originalEnv = { ...process.env };

// Mock the BlockchainTransactionService
jest.mock('../../src/services/blockchain-transaction.service', () => ({
  BlockchainTransactionService: jest.fn(),
  CONFIRMATION_REQUIREMENTS: { polygon: 12, ethereum: 3 },
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    paymentSession: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    refund: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  })),
  RefundStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    REFUNDED: 'REFUNDED',
  },
}));

// Mock WebhookDeliveryService
jest.mock('../../src/services/webhook-delivery.service', () => ({
  WebhookDeliveryService: jest.fn().mockImplementation(() => ({
    queueWebhook: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock BlockchainMonitorService (required by RefundService constructor)
jest.mock('../../src/services/blockchain-monitor.service', () => ({
  BlockchainMonitorService: jest.fn().mockImplementation(() => ({
    getConfirmations: jest.fn().mockResolvedValue(0),
  })),
}));

// Mock RefundQueryService (required by RefundService constructor)
jest.mock('../../src/services/refund-query.service', () => ({
  RefundQueryService: jest.fn().mockImplementation(() => ({
    getRefund: jest.fn(),
    listRefunds: jest.fn(),
    toResponse: jest.fn(),
  })),
}));

// Mock RefundFinalizationService (required by RefundService constructor)
jest.mock('../../src/services/refund-finalization.service', () => ({
  RefundFinalizationService: jest.fn().mockImplementation(() => ({
    completeRefund: jest.fn(),
    failRefund: jest.fn(),
    confirmRefundFinality: jest.fn(),
  })),
  computeRefundedTotal: jest.fn(),
  computeRemainingAmount: jest.fn(),
}));

// Mock crypto utils
jest.mock('../../src/utils/crypto', () => ({
  generateRefundId: jest.fn().mockReturnValue('ref_test123'),
}));

describe('RefundService Failsafe', () => {
  let BlockchainTransactionService: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset env
    process.env = { ...originalEnv };

    // Get mocked BlockchainTransactionService
    BlockchainTransactionService = require('../../src/services/blockchain-transaction.service').BlockchainTransactionService;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Constructor - Production Environment', () => {
    it('should throw error in production when blockchain service fails to initialize', async () => {
      process.env.NODE_ENV = 'production';

      // Make BlockchainTransactionService throw
      BlockchainTransactionService.mockImplementation(() => {
        throw new Error('MERCHANT_WALLET_PRIVATE_KEY not configured');
      });

      // Import RefundService fresh
      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();

      // Should throw in production - the error message includes the wrapper text
      expect(() => new RefundService(mockPrisma)).toThrow(
        'BlockchainTransactionService initialization failed in production'
      );
    });

    it('should include original error message when failing in production', async () => {
      process.env.NODE_ENV = 'production';

      const originalError = 'MERCHANT_WALLET_PRIVATE_KEY not configured';
      BlockchainTransactionService.mockImplementation(() => {
        throw new Error(originalError);
      });

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();

      // The actual error message includes the original error text
      expect(() => new RefundService(mockPrisma)).toThrow(originalError);
    });
  });

  describe('Constructor - Development/Test Environment', () => {
    it('should allow missing blockchain service in development with warning', async () => {
      process.env.NODE_ENV = 'development';

      // Make BlockchainTransactionService throw
      BlockchainTransactionService.mockImplementation(() => {
        throw new Error('MERCHANT_WALLET_PRIVATE_KEY not configured');
      });

      // logger.warn calls console.log (not console.warn)
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();

      // Should NOT throw in development
      expect(() => new RefundService(mockPrisma)).not.toThrow();

      // Should log warning via logger (which uses console.log)
      const logCalls = logSpy.mock.calls.map(call => String(call[0]));
      const hasWarning = logCalls.some(msg =>
        msg.includes('BlockchainTransactionService not available')
      );
      expect(hasWarning).toBe(true);

      logSpy.mockRestore();
    });

    it('should allow missing blockchain service in test environment', async () => {
      process.env.NODE_ENV = 'test';

      BlockchainTransactionService.mockImplementation(() => {
        throw new Error('No wallet configured');
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();

      expect(() => new RefundService(mockPrisma)).not.toThrow();

      logSpy.mockRestore();
    });
  });

  describe('isBlockchainAvailable', () => {
    it('should return true when blockchain service is available', async () => {
      process.env.NODE_ENV = 'test';

      // Make BlockchainTransactionService succeed
      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: jest.fn(),
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      expect(service.isBlockchainAvailable()).toBe(true);
    });

    it('should return false when blockchain service is not available', async () => {
      process.env.NODE_ENV = 'test';

      BlockchainTransactionService.mockImplementation(() => {
        throw new Error('Not configured');
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      expect(service.isBlockchainAvailable()).toBe(false);

      logSpy.mockRestore();
    });
  });

  describe('processRefund - Safety Checks', () => {
    it('should throw error in production when blockchain service unavailable', async () => {
      process.env.NODE_ENV = 'test'; // Allow construction

      BlockchainTransactionService.mockImplementation(() => {
        throw new Error('Not configured');
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      // Now simulate production for processRefund
      process.env.NODE_ENV = 'production';

      // Mock finding a refund
      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref_test123',
        status: 'PENDING',
        paymentSession: {
          id: 'ps_test',
          userId: 'user_test',
          network: 'polygon',
          token: 'USDC',
          customerAddress: '0x1234567890123456789012345678901234567890',
        },
      });

      await expect(service.processRefund('ref_test123')).rejects.toThrow(
        'blockchain service unavailable'
      );

      logSpy.mockRestore();
    });

    it('should skip on-chain execution in dev/test when blockchain unavailable', async () => {
      process.env.NODE_ENV = 'test';

      BlockchainTransactionService.mockImplementation(() => {
        throw new Error('Not configured');
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      // Mock finding a refund
      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref_test123',
        status: 'PENDING',
        paymentSession: {
          id: 'ps_test',
          userId: 'user_test',
          network: 'polygon',
          token: 'USDC',
          customerAddress: '0x1234567890123456789012345678901234567890',
        },
      });

      // Should not throw in test, just warn and return
      await expect(service.processRefund('ref_test123')).resolves.not.toThrow();

      // Should log warning about skipping (via logger which uses console.log)
      const logCalls = logSpy.mock.calls.map(call => String(call[0]));
      const hasSkipWarning = logCalls.some(msg =>
        msg.includes('Skipping on-chain refund')
      );
      expect(hasSkipWarning).toBe(true);

      logSpy.mockRestore();
    });

    it('should process refund normally when blockchain service is available', async () => {
      process.env.NODE_ENV = 'test';

      const mockExecuteRefund = jest.fn().mockResolvedValue({
        success: true,
        txHash: '0xabc123',
        blockNumber: 12345,
      });

      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: mockExecuteRefund,
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      // Setup mocks for the full flow
      const mockDate = new Date('2024-01-15T10:00:00Z');
      const mockRefund = {
        id: 'ref_test123',
        status: 'PENDING',
        amount: 50,
        reason: 'Test refund',
        paymentSessionId: 'ps_test',
        createdAt: mockDate,
        completedAt: null,
        txHash: null,
        blockNumber: null,
        paymentSession: {
          id: 'ps_test',
          userId: 'user_test',
          network: 'polygon',
          token: 'USDC',
          customerAddress: '0x1234567890123456789012345678901234567890',
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.refund.update as jest.Mock).mockResolvedValue({
        ...mockRefund,
        status: 'PROCESSING',
        txHash: '0xabc123',
        blockNumber: 12345,
        completedAt: new Date('2024-01-15T10:05:00Z'),
        paymentSession: mockRefund.paymentSession,
      });
      (mockPrisma.paymentSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'ps_test',
        userId: 'user_test',
        amount: 100,
        refunds: [{ amount: 50, status: 'COMPLETED' }],
      });

      await service.processRefund('ref_test123');

      expect(mockExecuteRefund).toHaveBeenCalledWith({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: '0x1234567890123456789012345678901234567890',
        amount: '50',
      });
    });
  });
});
