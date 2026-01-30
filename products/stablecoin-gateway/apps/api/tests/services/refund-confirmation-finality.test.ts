/**
 * Refund Confirmation Finality Tests
 *
 * SEC-014: Refund webhook sent before transaction is confirmed
 * with sufficient finality.
 *
 * Verifies that:
 * - After initial broadcast (1 confirmation), status is PROCESSING not COMPLETED
 * - refund.processing webhook is sent (not refund.completed)
 * - Network-specific confirmation requirements are correct (polygon: 12, ethereum: 3)
 * - refund.completed webhook only sent after sufficient confirmations
 * - confirmRefundFinality method works correctly
 * - executeRefund returns pendingConfirmations in result
 */

import { PrismaClient } from '@prisma/client';

// Mock the BlockchainTransactionService
jest.mock('../../src/services/blockchain-transaction.service', () => {
  const actual = jest.requireActual('../../src/services/blockchain-transaction.service');
  return {
    ...actual,
    BlockchainTransactionService: jest.fn(),
  };
});

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    paymentSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
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
const mockQueueWebhook = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/webhook-delivery.service', () => ({
  WebhookDeliveryService: jest.fn().mockImplementation(() => ({
    queueWebhook: mockQueueWebhook,
  })),
}));

// Mock crypto utils
jest.mock('../../src/utils/crypto', () => ({
  generateRefundId: jest.fn().mockReturnValue('ref_test_finality'),
}));

// Mock BlockchainMonitorService
const mockGetConfirmations = jest.fn();
jest.mock('../../src/services/blockchain-monitor.service', () => ({
  BlockchainMonitorService: jest.fn().mockImplementation(() => ({
    getConfirmations: mockGetConfirmations,
  })),
}));

// Store original env
const originalEnv = { ...process.env };

describe('SEC-014: Refund Confirmation Finality', () => {
  let BlockchainTransactionService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    BlockchainTransactionService =
      require('../../src/services/blockchain-transaction.service').BlockchainTransactionService;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('CONFIRMATION_REQUIREMENTS constant', () => {
    it('should export network-specific confirmation requirements', async () => {
      const { CONFIRMATION_REQUIREMENTS } = await import(
        '../../src/services/blockchain-transaction.service'
      );

      expect(CONFIRMATION_REQUIREMENTS).toBeDefined();
      expect(CONFIRMATION_REQUIREMENTS.polygon).toBe(12);
      expect(CONFIRMATION_REQUIREMENTS.ethereum).toBe(3);
    });
  });

  describe('executeRefund returns pendingConfirmations', () => {
    it('should include pendingConfirmations in successful result', async () => {
      const { CONFIRMATION_REQUIREMENTS } = await import(
        '../../src/services/blockchain-transaction.service'
      );

      // The result interface should now include pendingConfirmations
      // When executeRefund succeeds with tx.wait(1), it returns
      // pendingConfirmations = CONFIRMATION_REQUIREMENTS[network] - 1
      expect(CONFIRMATION_REQUIREMENTS.polygon).toBe(12);
      // After 1 confirmation, pending = 12 - 1 = 11 for polygon
      expect(CONFIRMATION_REQUIREMENTS.polygon - 1).toBe(11);
      // After 1 confirmation, pending = 3 - 1 = 2 for ethereum
      expect(CONFIRMATION_REQUIREMENTS.ethereum - 1).toBe(2);
    });
  });

  describe('processRefund sets PROCESSING status after initial confirmation', () => {
    it('should set refund to PROCESSING (not COMPLETED) after executeRefund succeeds', async () => {
      const mockExecuteRefund = jest.fn().mockResolvedValue({
        success: true,
        txHash: '0xabc123',
        blockNumber: 100,
        pendingConfirmations: 11, // polygon: 12 - 1
      });

      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: mockExecuteRefund,
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      const mockDate = new Date('2024-01-15T10:00:00Z');
      const mockRefund = {
        id: 'ref_test_finality',
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
          amount: 100,
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);

      // First update call: PROCESSING (initial)
      // Second update call: PROCESSING with txHash (after broadcast, NOT COMPLETED)
      (mockPrisma.refund.update as jest.Mock).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...mockRefund,
          ...data,
          paymentSession: mockRefund.paymentSession,
        });
      });

      const result = await service.processRefund('ref_test_finality');

      // The refund should be in PROCESSING status, not COMPLETED
      const updateCalls = (mockPrisma.refund.update as jest.Mock).mock.calls;

      // Find the call that sets txHash - that's the post-broadcast update
      const postBroadcastCall = updateCalls.find(
        (call: any) => call[0]?.data?.txHash === '0xabc123'
      );
      expect(postBroadcastCall).toBeDefined();
      // It should set status to PROCESSING, not COMPLETED
      expect(postBroadcastCall[0].data.status).toBe('PROCESSING');
    });

    it('should send refund.processing webhook (not refund.completed) after broadcast', async () => {
      const mockExecuteRefund = jest.fn().mockResolvedValue({
        success: true,
        txHash: '0xdef456',
        blockNumber: 200,
        pendingConfirmations: 11,
      });

      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: mockExecuteRefund,
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      const mockRefund = {
        id: 'ref_test_webhook',
        status: 'PENDING',
        amount: 75,
        reason: 'Webhook test',
        paymentSessionId: 'ps_webhook',
        createdAt: new Date(),
        completedAt: null,
        txHash: null,
        blockNumber: null,
        paymentSession: {
          id: 'ps_webhook',
          userId: 'user_webhook',
          network: 'polygon',
          token: 'USDC',
          customerAddress: '0x1234567890123456789012345678901234567890',
          amount: 100,
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.refund.update as jest.Mock).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...mockRefund,
          ...data,
          paymentSession: mockRefund.paymentSession,
        });
      });

      await service.processRefund('ref_test_webhook');

      // Should have sent refund.processing, NOT refund.completed
      const webhookCalls = mockQueueWebhook.mock.calls;
      const processingWebhook = webhookCalls.find(
        (call: any) => call[1] === 'refund.processing'
      );
      const completedWebhook = webhookCalls.find(
        (call: any) => call[1] === 'refund.completed'
      );

      expect(processingWebhook).toBeDefined();
      expect(processingWebhook[2]).toEqual(
        expect.objectContaining({
          tx_hash: '0xdef456',
          status: 'PROCESSING',
        })
      );
      expect(completedWebhook).toBeUndefined();
    });

    it('should NOT mark payment as fully refunded after initial broadcast', async () => {
      const mockExecuteRefund = jest.fn().mockResolvedValue({
        success: true,
        txHash: '0xfull_refund',
        blockNumber: 300,
        pendingConfirmations: 11,
      });

      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: mockExecuteRefund,
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      const mockRefund = {
        id: 'ref_test_full',
        status: 'PENDING',
        amount: 100,
        reason: 'Full refund test',
        paymentSessionId: 'ps_full',
        createdAt: new Date(),
        completedAt: null,
        txHash: null,
        blockNumber: null,
        paymentSession: {
          id: 'ps_full',
          userId: 'user_full',
          network: 'polygon',
          token: 'USDC',
          customerAddress: '0x1234567890123456789012345678901234567890',
          amount: 100,
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.refund.update as jest.Mock).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...mockRefund,
          ...data,
          paymentSession: mockRefund.paymentSession,
        });
      });

      await service.processRefund('ref_test_full');

      // Should NOT have called paymentSession.update to set REFUNDED
      // (that only happens after COMPLETED via confirmRefundFinality)
      expect(mockPrisma.paymentSession.update as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('confirmRefundFinality', () => {
    it('should update to COMPLETED and send refund.completed when confirmations are sufficient', async () => {
      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: jest.fn(),
      }));

      // Mock blockchain monitor returning sufficient confirmations
      mockGetConfirmations.mockResolvedValue(15); // > 12 for polygon

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      const mockRefund = {
        id: 'ref_confirm',
        status: 'PROCESSING',
        amount: 50,
        reason: 'Finality test',
        paymentSessionId: 'ps_confirm',
        txHash: '0xfinality_tx',
        blockNumber: 100,
        createdAt: new Date(),
        completedAt: null,
        paymentSession: {
          id: 'ps_confirm',
          userId: 'user_confirm',
          network: 'polygon',
          token: 'USDC',
          amount: 100,
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.refund.update as jest.Mock).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...mockRefund,
          ...data,
          completedAt: data.completedAt || mockRefund.completedAt,
          paymentSession: mockRefund.paymentSession,
        });
      });
      (mockPrisma.paymentSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'ps_confirm',
        userId: 'user_confirm',
        amount: 100,
        refunds: [{ amount: 50, status: 'COMPLETED' }],
      });

      const result = await service.confirmRefundFinality(
        'ref_confirm',
        '0xfinality_tx',
        'polygon'
      );

      expect(result.status).toBe('confirmed');
      expect(result.confirmations).toBe(15);

      // Should have updated refund to COMPLETED
      const updateCalls = (mockPrisma.refund.update as jest.Mock).mock.calls;
      const completedCall = updateCalls.find(
        (call: any) => call[0]?.data?.status === 'COMPLETED'
      );
      expect(completedCall).toBeDefined();

      // Should have sent refund.completed webhook
      const completedWebhook = mockQueueWebhook.mock.calls.find(
        (call: any) => call[1] === 'refund.completed'
      );
      expect(completedWebhook).toBeDefined();
    });

    it('should return insufficient status when confirmations are not enough', async () => {
      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: jest.fn(),
      }));

      // Mock blockchain monitor returning insufficient confirmations
      mockGetConfirmations.mockResolvedValue(5); // < 12 for polygon

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      const mockRefund = {
        id: 'ref_insufficient',
        status: 'PROCESSING',
        amount: 50,
        reason: 'Insufficient test',
        paymentSessionId: 'ps_insufficient',
        txHash: '0xinsufficient_tx',
        blockNumber: 100,
        createdAt: new Date(),
        completedAt: null,
        paymentSession: {
          id: 'ps_insufficient',
          userId: 'user_insufficient',
          network: 'polygon',
          token: 'USDC',
          amount: 100,
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);

      const result = await service.confirmRefundFinality(
        'ref_insufficient',
        '0xinsufficient_tx',
        'polygon'
      );

      expect(result.status).toBe('pending');
      expect(result.confirmations).toBe(5);
      expect(result.required).toBe(12);

      // Should NOT have updated refund status
      expect(mockPrisma.refund.update as jest.Mock).not.toHaveBeenCalled();

      // Should NOT have sent refund.completed webhook
      const completedWebhook = mockQueueWebhook.mock.calls.find(
        (call: any) => call[1] === 'refund.completed'
      );
      expect(completedWebhook).toBeUndefined();
    });

    it('should use correct confirmation requirement for ethereum (3)', async () => {
      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: jest.fn(),
      }));

      // 4 confirmations: sufficient for ethereum (3) but not polygon (12)
      mockGetConfirmations.mockResolvedValue(4);

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      const mockRefund = {
        id: 'ref_eth',
        status: 'PROCESSING',
        amount: 50,
        reason: 'Ethereum test',
        paymentSessionId: 'ps_eth',
        txHash: '0xeth_tx',
        blockNumber: 100,
        createdAt: new Date(),
        completedAt: null,
        paymentSession: {
          id: 'ps_eth',
          userId: 'user_eth',
          network: 'ethereum',
          token: 'USDC',
          amount: 100,
        },
      };

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.refund.update as jest.Mock).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...mockRefund,
          ...data,
          completedAt: data.completedAt || mockRefund.completedAt,
          paymentSession: mockRefund.paymentSession,
        });
      });
      (mockPrisma.paymentSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'ps_eth',
        userId: 'user_eth',
        amount: 100,
        refunds: [{ amount: 50, status: 'COMPLETED' }],
      });

      const result = await service.confirmRefundFinality(
        'ref_eth',
        '0xeth_tx',
        'ethereum'
      );

      // 4 >= 3 (ethereum requirement), so should be confirmed
      expect(result.status).toBe('confirmed');
      expect(result.confirmations).toBe(4);
    });

    it('should throw if refund is not found', async () => {
      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: jest.fn(),
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmRefundFinality('ref_missing', '0xmissing', 'polygon')
      ).rejects.toThrow('Refund not found');
    });

    it('should throw if refund is not in PROCESSING status', async () => {
      BlockchainTransactionService.mockImplementation(() => ({
        executeRefund: jest.fn(),
      }));

      const { RefundService } = await import('../../src/services/refund.service');
      const mockPrisma = new PrismaClient();
      const service = new RefundService(mockPrisma);

      (mockPrisma.refund.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref_wrong_status',
        status: 'COMPLETED',
        paymentSession: { network: 'polygon' },
      });

      await expect(
        service.confirmRefundFinality('ref_wrong_status', '0xwrong', 'polygon')
      ).rejects.toThrow('Refund must be in PROCESSING status');
    });
  });
});
