/**
 * Payment Verification Precision Tests
 *
 * Verifies that verifyPaymentTransaction uses Decimal.js throughout
 * the comparison logic instead of converting to Number via .toNumber(),
 * which causes IEEE 754 floating-point precision loss.
 *
 * The bug: .toNumber() on lines 194 and 240 converts Decimal to
 * JavaScript Number, losing precision. When the Decimal result has
 * more than ~15.9 significant digits, .toNumber() rounds the value.
 * This can cause:
 *   - False positive: underpayment rounds UP to match session amount
 *   - False negative: exact payment rounds DOWN below session amount
 *
 * Proven mismatch:
 *   wei = 999999999999999999, decimals = 6
 *   Decimal division: 999999999999.999999
 *   .toNumber():      1000000000000 (rounds UP!)
 *   Session amount:   1000000000000
 *   Number >=: true  (BUG: accepts underpayment of $0.000001)
 *   Decimal >=: false (correct: rejects underpayment)
 */

import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';
import { ethers } from 'ethers';

function createMockProviderManager(mockProvider: any): ProviderManager {
  const pm = new ProviderManager();
  jest.spyOn(pm, 'getProvider').mockResolvedValue(
    mockProvider as ethers.JsonRpcProvider
  );
  return pm;
}

/**
 * Build a mock provider whose receipt contains a single Transfer log
 * paying `amountWei` to `merchantAddress` on Polygon USDC, with 16
 * confirmations (above the default minimum of 12).
 */
function buildMockProvider(
  merchantAddress: string,
  amountWei: bigint
): any {
  const usdcPolygon = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const sender = '0x9999999999999999999999999999999999999999';

  return {
    getTransactionReceipt: jest.fn().mockResolvedValue({
      blockNumber: 100,
      logs: [
        {
          address: usdcPolygon,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            '0x000000000000000000000000' + sender.slice(2),
            '0x000000000000000000000000' + merchantAddress.slice(2),
          ],
          data: ethers.toBeHex(amountWei, 32),
        },
      ],
    }),
    getBlockNumber: jest.fn().mockResolvedValue(115),
  };
}

describe('Payment verification precision (Decimal comparisons)', () => {
  const merchantAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  it('should reject underpayment that .toNumber() rounds up to match', async () => {
    // CRITICAL precision bug:
    // wei = 999999999999999999 => Decimal: 999999999999.999999
    // .toNumber() rounds to 1000000000000 (1 trillion)
    // Session expects exactly 1000000000000.
    //
    // With .toNumber(): 1e12 >= 1e12 => true (WRONG: accepts $0.000001 underpayment)
    // With Decimal:     999999999999.999999 >= 1e12 => false (correct: rejects)
    const sessionAmount = 1000000000000; // 1 trillion
    const amountWei = BigInt('999999999999999999'); // 999999999999.999999

    const mockProvider = buildMockProvider(merchantAddress, amountWei);
    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({ providerManager: pm });

    const result = await service.verifyPaymentTransaction(
      {
        id: 'ps_precision_roundup',
        network: 'polygon',
        token: 'USDC',
        amount: sessionAmount,
        merchantAddress,
      },
      '0xabc1230000000000000000000000000000000000000000000000000000000001'
    );

    // Must be rejected: actual amount is $0.000001 less than required
    expect(result.valid).toBe(false);
  });

  it('should verify exact large payment without precision loss', async () => {
    // Exact payment: 1000000000000 USDC = 1000000000000000000 wei
    // Both Decimal and Number should agree this matches.
    const sessionAmount = 1000000000000;
    const amountWei = BigInt('1000000000000000000');

    const mockProvider = buildMockProvider(merchantAddress, amountWei);
    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({ providerManager: pm });

    const result = await service.verifyPaymentTransaction(
      {
        id: 'ps_precision_exact',
        network: 'polygon',
        token: 'USDC',
        amount: sessionAmount,
        merchantAddress,
      },
      '0xabc1230000000000000000000000000000000000000000000000000000000002'
    );

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept overpayment with precise comparison', async () => {
    // Session expects 100 USDC. Transfer sends 100.000001.
    const sessionAmount = 100;
    const amountWei = BigInt('100000001'); // 100.000001 USDC

    const mockProvider = buildMockProvider(merchantAddress, amountWei);
    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({ providerManager: pm });

    const result = await service.verifyPaymentTransaction(
      {
        id: 'ps_precision_over',
        network: 'polygon',
        token: 'USDC',
        amount: sessionAmount,
        merchantAddress,
      },
      '0xabc1230000000000000000000000000000000000000000000000000000000003'
    );

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject underpayment with precise comparison', async () => {
    // Session expects 100 USDC. Transfer sends 99.999999.
    const sessionAmount = 100;
    const amountWei = BigInt('99999999'); // 99.999999 USDC

    const mockProvider = buildMockProvider(merchantAddress, amountWei);
    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({ providerManager: pm });

    const result = await service.verifyPaymentTransaction(
      {
        id: 'ps_precision_under',
        network: 'polygon',
        token: 'USDC',
        amount: sessionAmount,
        merchantAddress,
      },
      '0xabc1230000000000000000000000000000000000000000000000000000000004'
    );

    expect(result.valid).toBe(false);
  });
});
