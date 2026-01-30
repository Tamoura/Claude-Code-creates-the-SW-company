import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';
import { ethers } from 'ethers';

/**
 * Sender Validation Tests
 *
 * Verifies that the blockchain monitor validates the transfer sender
 * against the expected customer wallet address when provided.
 * This prevents accepting payments sent from unauthorised wallets.
 */

function createServiceWithMock(mockProvider: any): BlockchainMonitorService {
  const pm = new ProviderManager();
  jest.spyOn(pm, 'getProvider').mockResolvedValue(mockProvider as ethers.JsonRpcProvider);
  return new BlockchainMonitorService({ providerManager: pm });
}

const USDC_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const TRANSFER_SIG = ethers.id('Transfer(address,address,uint256)');
const MERCHANT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const CUSTOMER = '0xABCDabcdABCDabcdABCDabcdABCDabcdABCDabcd';

function padAddress(addr: string): string {
  return '0x000000000000000000000000' + addr.slice(2).toLowerCase();
}

function buildMockProvider(fromAddr: string) {
  return {
    getTransactionReceipt: jest.fn().mockResolvedValue({
      blockNumber: 100,
      logs: [
        {
          address: USDC_POLYGON,
          topics: [
            TRANSFER_SIG,
            padAddress(fromAddr),
            padAddress(MERCHANT),
          ],
          data: ethers.toBeHex(100_000000, 32), // 100 USDC
        },
      ],
    }),
    getBlockNumber: jest.fn().mockResolvedValue(115), // 16 confirmations
  };
}

describe('BlockchainMonitorService - Sender Validation', () => {
  const TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  it('should accept payment when sender matches customerAddress', async () => {
    const mockProvider = buildMockProvider(CUSTOMER);
    const service = createServiceWithMock(mockProvider);

    const session = {
      id: 'ps_sender_match',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 100,
      merchantAddress: MERCHANT,
      customerAddress: CUSTOMER,
    };

    const result = await service.verifyPaymentTransaction(session, TX_HASH);

    expect(result.valid).toBe(true);
    expect(result.sender.toLowerCase()).toBe(CUSTOMER.toLowerCase());
    expect(result.error).toBeUndefined();
  });

  it('should reject payment when sender does not match customerAddress', async () => {
    const unexpectedSender = '0x1111111111111111111111111111111111111111';
    const mockProvider = buildMockProvider(unexpectedSender);
    const service = createServiceWithMock(mockProvider);

    const session = {
      id: 'ps_sender_mismatch',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 100,
      merchantAddress: MERCHANT,
      customerAddress: CUSTOMER,
    };

    const result = await service.verifyPaymentTransaction(session, TX_HASH);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Sender mismatch');
    expect(result.error).toContain(CUSTOMER);
    expect(result.error).toContain(unexpectedSender);
  });

  it('should skip sender validation when customerAddress is not set', async () => {
    const anySender = '0x9999999999999999999999999999999999999999';
    const mockProvider = buildMockProvider(anySender);
    const service = createServiceWithMock(mockProvider);

    const session = {
      id: 'ps_no_customer',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 100,
      merchantAddress: MERCHANT,
      // No customerAddress -- backwards compatible
    };

    const result = await service.verifyPaymentTransaction(session, TX_HASH);

    expect(result.valid).toBe(true);
    expect(result.sender.toLowerCase()).toBe(anySender.toLowerCase());
    expect(result.error).toBeUndefined();
  });

  it('should compare sender address case-insensitively', async () => {
    // Use upper-case sender in the Transfer log
    const upperCaseCustomer = '0xABCDABCDABCDABCDABCDABCDABCDABCDABCDABCD';
    const mockProvider = buildMockProvider(upperCaseCustomer);
    const service = createServiceWithMock(mockProvider);

    // Session stores the address in lower-case
    const session = {
      id: 'ps_case_insensitive',
      network: 'polygon' as const,
      token: 'USDC' as const,
      amount: 100,
      merchantAddress: MERCHANT,
      customerAddress: upperCaseCustomer.toLowerCase(),
    };

    const result = await service.verifyPaymentTransaction(session, TX_HASH);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
