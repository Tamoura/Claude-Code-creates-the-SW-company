import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ethers } from 'ethers';

/**
 * Security test: payment amount tolerance must reject underpayment.
 *
 * The blockchain monitor must accept exact or overpayment ONLY.
 * Any amount below the expected payment must be rejected, no matter
 * how small the shortfall. The previous tolerance of $0.01 allowed
 * attackers to systematically underpay on every transaction.
 */
describe('BlockchainMonitorService - payment amount tolerance (security)', () => {
  let service: BlockchainMonitorService;

  const USDC_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const TRANSFER_SIG = ethers.id('Transfer(address,address,uint256)');
  const SENDER = '0x9999999999999999999999999999999999999999';
  const MERCHANT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  const paymentSession = {
    id: 'ps_tolerance_test',
    network: 'polygon' as const,
    token: 'USDC' as const,
    amount: 100,
    merchantAddress: MERCHANT,
  };

  function buildMockProvider(amountMicroUnits: number) {
    return {
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        blockNumber: 100,
        logs: [
          {
            address: USDC_POLYGON,
            topics: [
              TRANSFER_SIG,
              '0x000000000000000000000000' + SENDER.slice(2),
              '0x000000000000000000000000' + MERCHANT.slice(2),
            ],
            data: ethers.toBeHex(amountMicroUnits, 32),
          },
        ],
      }),
      getBlockNumber: jest.fn().mockResolvedValue(115), // 16 confirmations
    };
  }

  beforeEach(() => {
    service = new BlockchainMonitorService();
  });

  it('should ACCEPT exact payment amount', async () => {
    // 100.000000 USDC (exactly $100)
    const mock = buildMockProvider(100_000000);
    (service as any).providers.set('polygon', mock);

    const result = await service.verifyPaymentTransaction(paymentSession, TX_HASH);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should ACCEPT overpayment', async () => {
    // 100.050000 USDC ($0.05 overpayment)
    const mock = buildMockProvider(100_050000);
    (service as any).providers.set('polygon', mock);

    const result = await service.verifyPaymentTransaction(paymentSession, TX_HASH);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should REJECT underpayment of $0.01', async () => {
    // 99.990000 USDC ($0.01 underpayment)
    const mock = buildMockProvider(99_990000);
    (service as any).providers.set('polygon', mock);

    const result = await service.verifyPaymentTransaction(paymentSession, TX_HASH);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should REJECT underpayment of $0.001', async () => {
    // 99.999000 USDC ($0.001 underpayment)
    const mock = buildMockProvider(99_999000);
    (service as any).providers.set('polygon', mock);

    const result = await service.verifyPaymentTransaction(paymentSession, TX_HASH);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
