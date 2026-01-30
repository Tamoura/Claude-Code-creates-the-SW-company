import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';
import { ethers } from 'ethers';

/**
 * Blockchain Multi-Transfer Tests
 *
 * Verifies that blockchain verification correctly handles transactions with multiple transfers.
 * This prevents false negatives when transactions include:
 * - Fee payments
 * - Multi-send operations
 * - Other transfers in the same transaction
 */

function createServiceWithMock(mockProvider: any): BlockchainMonitorService {
  const pm = new ProviderManager();
  jest.spyOn(pm, 'getProvider').mockResolvedValue(mockProvider as ethers.JsonRpcProvider);
  return new BlockchainMonitorService({ providerManager: pm });
}

describe('BlockchainMonitorService - Multi-Transfer Scenarios', () => {

  it('should find correct transfer when transaction has multiple transfers', async () => {
    const paymentSession = {
      id: 'test-payment-1',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 100,
      merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };

    // Mock a transaction with 3 transfers:
    // 1. Fee payment to protocol (10 USDC)
    // 2. Actual payment to merchant (100 USDC) <- This is what we want
    // 3. Refund to sender (5 USDC)
    const mockTxHash = '0xmultitransfer123';

    // Create mock provider response
    const mockReceipt = {
      blockNumber: 12345,
      logs: [
        // Transfer 1: Fee payment (10 USDC to fee collector)
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event signature
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'), // from (sender)
            '0x000000000000000000000000' + 'fee12345'.padStart(40, '0'), // to (fee collector)
          ],
          data: '0x' + (BigInt(10_000000)).toString(16).padStart(64, '0'), // 10 USDC (6 decimals)
        },
        // Transfer 2: Actual payment (100 USDC to merchant) <- This should match
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'), // from (sender)
            '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2).toLowerCase(), // to (merchant)
          ],
          data: '0x' + (BigInt(100_000000)).toString(16).padStart(64, '0'), // 100 USDC
        },
        // Transfer 3: Refund (5 USDC back to sender)
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'merchant'.padStart(40, '0'), // from (merchant)
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'), // to (sender)
          ],
          data: '0x' + (BigInt(5_000000)).toString(16).padStart(64, '0'), // 5 USDC
        },
      ],
    };

    // Mock the provider
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
      getBlockNumber: jest.fn().mockResolvedValue(12400),
    };

    const service = createServiceWithMock(mockProvider);

    const result = await service.verifyPaymentTransaction(
      paymentSession,
      mockTxHash,
      1 // minConfirmations
    );

    // Should successfully find the correct transfer (transfer 2)
    expect(result.valid).toBe(true);
    expect(result.blockNumber).toBe(12345);
    expect(result.confirmations).toBeGreaterThanOrEqual(1);
  });

  it('should reject when no transfer matches both recipient and amount', async () => {
    const paymentSession = {
      id: 'test-payment-2',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 200, // Looking for 200 USDC
      merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };

    const mockTxHash = '0xnomatch123';

    const mockReceipt = {
      blockNumber: 12345,
      logs: [
        // Transfer 1: 100 USDC to merchant (wrong amount)
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'),
            '0x000000000000000000000000' + paymentSession.merchantAddress.slice(2).toLowerCase(),
          ],
          data: '0x' + (BigInt(100_000000)).toString(16).padStart(64, '0'), // 100, not 200
        },
        // Transfer 2: 200 USDC to different address (wrong recipient)
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'),
            '0x000000000000000000000000' + 'wrongaddr'.padStart(40, '0'), // Wrong recipient
          ],
          data: '0x' + (BigInt(200_000000)).toString(16).padStart(64, '0'), // Correct amount
        },
      ],
    };

    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
      getBlockNumber: jest.fn().mockResolvedValue(12400),
    };

    const service = createServiceWithMock(mockProvider);

    const result = await service.verifyPaymentTransaction(
      paymentSession,
      mockTxHash,
      1
    );

    // Should reject - no transfer matches BOTH recipient AND amount
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching transfer found');
    expect(result.error).toContain('200 USDC');
    expect(result.error).toContain('Found 2 transfer(s)');
  });

  it('should handle transaction with only wrong transfers gracefully', async () => {
    const paymentSession = {
      id: 'test-payment-3',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 50,
      merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };

    const mockTxHash = '0xwrongtransfers';

    const mockReceipt = {
      blockNumber: 12345,
      logs: [
        // All transfers are to different addresses and different amounts
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'),
            '0x000000000000000000000000' + 'addr00001'.padStart(40, '0'),
          ],
          data: '0x' + (BigInt(25_000000)).toString(16).padStart(64, '0'),
        },
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'sender123'.padStart(40, '0'),
            '0x000000000000000000000000' + 'addr00002'.padStart(40, '0'),
          ],
          data: '0x' + (BigInt(75_000000)).toString(16).padStart(64, '0'),
        },
      ],
    };

    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
      getBlockNumber: jest.fn().mockResolvedValue(12400),
    };

    const service = createServiceWithMock(mockProvider);

    const result = await service.verifyPaymentTransaction(
      paymentSession,
      mockTxHash,
      1
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching transfer found');
  });
});
