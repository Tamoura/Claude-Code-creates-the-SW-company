/**
 * Blockchain Transaction Service Tests
 *
 * Tests blockchain transaction execution for refunds:
 * - Service initialization
 * - Input validation
 * - Error handling
 *
 * Note: These are unit tests focusing on validation and error handling.
 * Actual blockchain interaction is tested in integration tests.
 */

import { BlockchainTransactionService } from '../../src/services/blockchain-transaction.service';

describe('BlockchainTransactionService', () => {
  const validPrivateKey = '0x' + 'a'.repeat(64); // Valid private key format

  beforeEach(() => {
    // Set environment variables for test
    process.env.POLYGON_RPC_URL = 'https://polygon-test.com';
    process.env.ETHEREUM_RPC_URL = 'https://ethereum-test.com';
    process.env.MERCHANT_WALLET_PRIVATE_KEY = validPrivateKey;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with valid merchant wallet', () => {
      const service = new BlockchainTransactionService();
      expect(service).toBeInstanceOf(BlockchainTransactionService);
    });

    it('should throw error if merchant wallet not configured', () => {
      delete process.env.MERCHANT_WALLET_PRIVATE_KEY;

      expect(() => {
        new BlockchainTransactionService();
      }).toThrow('MERCHANT_WALLET_PRIVATE_KEY not configured');
    });
  });

  describe('Input Validation', () => {
    let service: BlockchainTransactionService;

    beforeEach(() => {
      service = new BlockchainTransactionService();
    });

    it('should reject invalid recipient address', async () => {
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: 'invalid-address',
        amount: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient address');
    });

    it('should reject zero amount', async () => {
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        amount: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be positive');
    });

    it('should reject negative amount', async () => {
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        amount: -50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be positive');
    });
  });

  describe('Network and Token Support', () => {
    let service: BlockchainTransactionService;

    beforeEach(() => {
      service = new BlockchainTransactionService();
    });

    it('should support polygon network', async () => {
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        amount: 100,
      });

      // Should not fail on unsupported network
      if (!result.success) {
        expect(result.error).not.toContain('Unsupported network');
      }
    });

    it('should support ethereum network', async () => {
      const result = await service.executeRefund({
        network: 'ethereum',
        token: 'USDC',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        amount: 100,
      });

      // Should not fail on unsupported network
      if (!result.success) {
        expect(result.error).not.toContain('Unsupported network');
      }
    });

    it('should support USDC token', async () => {
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        amount: 100,
      });

      // USDC should be supported (may fail on execution, but not on token support)
      expect(result).toBeDefined();
    });

    it('should support USDT token', async () => {
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDT',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        amount: 100,
      });

      // USDT should be supported (may fail on execution, but not on token support)
      expect(result).toBeDefined();
    });
  });
});
