import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';
import { ethers } from 'ethers';

/**
 * Helper: create a ProviderManager that returns a mock provider
 * for the given network without performing a real health check.
 */
function createMockProviderManager(mockProvider: any): ProviderManager {
  const pm = new ProviderManager();
  jest.spyOn(pm, 'getProvider').mockResolvedValue(mockProvider as ethers.JsonRpcProvider);
  return pm;
}

describe('BlockchainMonitorService', () => {
  describe('verifyPaymentTransaction', () => {
    it('should reject transaction that does not exist on blockchain', async () => {
      const service = new BlockchainMonitorService();
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject transaction with insufficient confirmations', async () => {
      // This test will use a mocked provider that returns a transaction with low confirmations
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      // Create mock provider
      const mockProvider = {
        getTransaction: jest.fn().mockResolvedValue({
          hash: '0xabc',
          blockNumber: 100,
        }),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
          logs: [],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(105), // Only 6 confirmations
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient confirmations');
      expect(result.confirmations).toBe(6);
    });

    it('should reject transaction with wrong recipient address', async () => {
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      // Mock a transaction to a different address
      const wrongRecipient = '0x1111111111111111111111111111111111111111';

      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
          logs: [
            {
              address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC Polygon
              topics: [
                ethers.id('Transfer(address,address,uint256)'),
                '0x000000000000000000000000' + '1111111111111111111111111111111111111111', // from (padded)
                '0x000000000000000000000000' + wrongRecipient.slice(2), // to (padded)
              ],
              data: ethers.toBeHex(100_000000, 32), // 100 USDC (6 decimals)
            },
          ],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(115), // 16 confirmations
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No matching transfer found');
    });

    it('should reject transaction with wrong token contract', async () => {
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      // Mock a transaction with USDT instead of USDC
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
          logs: [
            {
              address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT Polygon (wrong token)
              topics: [
                ethers.id('Transfer(address,address,uint256)'),
                '0x000000000000000000000000' + '1111111111111111111111111111111111111111',
                '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2),
              ],
              data: ethers.toBeHex(100_000000, 32),
            },
          ],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(115),
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('transfer found');
    });

    it('should reject transaction with wrong amount', async () => {
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100, // Expecting 100 USDC
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      // Mock a transaction with only 50 USDC
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
          logs: [
            {
              address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC Polygon
              topics: [
                ethers.id('Transfer(address,address,uint256)'),
                '0x000000000000000000000000' + '1111111111111111111111111111111111111111',
                '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2),
              ],
              data: ethers.toBeHex(50_000000, 32), // Only 50 USDC (not 100)
            },
          ],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(115),
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No matching transfer found');
    });

    it('should accept valid transaction with correct amount, recipient, and token', async () => {
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      const senderAddress = '0x9999999999999999999999999999999999999999';

      // Mock a valid transaction
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
          logs: [
            {
              address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC Polygon
              topics: [
                ethers.id('Transfer(address,address,uint256)'),
                '0x000000000000000000000000' + senderAddress.slice(2), // from
                '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2), // to (correct)
              ],
              data: ethers.toBeHex(100_000000, 32), // 100 USDC (correct amount)
            },
          ],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(115), // 16 confirmations (>= 12)
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(true);
      expect(result.confirmations).toBe(16);
      expect(result.blockNumber).toBe(100);
      expect(result.sender.toLowerCase()).toBe(senderAddress.toLowerCase());
      expect(result.error).toBeUndefined();
    });

    it('should REJECT transaction with micro-underpayment (security fix)', async () => {
      const paymentSession = {
        id: 'ps_123',
        network: 'polygon' as const,
        token: 'USDC' as const,
        amount: 100.00,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      // Mock a transaction with 99.999999 USDC (underpayment of $0.000001 - must be rejected)
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
          logs: [
            {
              address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC Polygon
              topics: [
                ethers.id('Transfer(address,address,uint256)'),
                '0x000000000000000000000000' + '1111111111111111111111111111111111111111',
                '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2),
              ],
              data: ethers.toBeHex(99_999999, 32), // 99.999999 USDC
            },
          ],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(115),
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(false);
    });

    it('should work with Ethereum network and USDT token', async () => {
      const paymentSession = {
        id: 'ps_456',
        network: 'ethereum' as const,
        token: 'USDT' as const,
        amount: 250,
        merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      // Mock a valid Ethereum USDT transaction
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 200,
          logs: [
            {
              address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Ethereum
              topics: [
                ethers.id('Transfer(address,address,uint256)'),
                '0x000000000000000000000000' + '8888888888888888888888888888888888888888',
                '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2),
              ],
              data: ethers.toBeHex(250_000000, 32), // 250 USDT
            },
          ],
        }),
        getBlockNumber: jest.fn().mockResolvedValue(215), // 16 confirmations
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const result = await service.verifyPaymentTransaction(
        paymentSession,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.valid).toBe(true);
      expect(result.confirmations).toBe(16);
    });
  });

  describe('getConfirmations', () => {
    it('should return number of confirmations for a transaction', async () => {
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          blockNumber: 100,
        }),
        getBlockNumber: jest.fn().mockResolvedValue(120),
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const confirmations = await service.getConfirmations(
        'polygon',
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(confirmations).toBe(21); // 120 - 100 + 1 = 21
    });

    it('should return 0 for non-existent transaction', async () => {
      const mockProvider = {
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn().mockResolvedValue(null),
        getBlockNumber: jest.fn().mockResolvedValue(120),
      };

      const pm = createMockProviderManager(mockProvider);
      const service = new BlockchainMonitorService({ providerManager: pm });

      const confirmations = await service.getConfirmations(
        'polygon',
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(confirmations).toBe(0);
    });
  });
});
