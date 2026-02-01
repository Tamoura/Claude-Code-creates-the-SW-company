/**
 * Wallet Network Caching Tests
 *
 * Verifies that getWallet() returns distinct wallet instances
 * per network, and caches correctly within the same network.
 *
 * Bug: wallet was cached as a single instance regardless of
 * network, so a Polygon wallet would be reused for Ethereum.
 */

// Build a mock transfer function for successful on-chain tx
const mockTransferFn = jest.fn().mockResolvedValue({
  hash: '0x' + 'b'.repeat(64),
  wait: jest.fn().mockResolvedValue({
    status: 1,
    blockNumber: 12345,
    gasUsed: BigInt(65000),
  }),
});
mockTransferFn.estimateGas = jest.fn().mockResolvedValue(BigInt(65000));

// Mock ethers to prevent real network connections from ProviderManager
jest.mock('ethers', () => {
  const real = jest.requireActual('ethers');
  return {
    ...real,
    ethers: {
      ...real.ethers,
      JsonRpcProvider: jest.fn().mockImplementation((url?: string) => ({
        getBlockNumber: jest.fn().mockResolvedValue(12345),
        _getConnection: jest.fn().mockReturnValue({
          url: url || 'https://mock-rpc.com',
        }),
      })),
      Contract: jest.fn().mockImplementation(() => ({
        transfer: mockTransferFn,
      })),
    },
  };
});

jest.mock('../../src/services/kms-signer.service', () => {
  const { ethers: ethersActual } = jest.requireActual('ethers');

  const polygonKey = '0x' + 'a'.repeat(64);
  const ethereumKey = '0x' + 'b'.repeat(64);
  const polygonWallet = new ethersActual.Wallet(polygonKey);
  const ethereumWallet = new ethersActual.Wallet(ethereumKey);

  const mockGetWallet = jest.fn((network: string) => {
    if (network === 'polygon') return Promise.resolve(polygonWallet);
    if (network === 'ethereum') return Promise.resolve(ethereumWallet);
    return Promise.reject(new Error(`Unknown network: ${network}`));
  });

  return {
    __esModule: true,
    __mockGetWallet: mockGetWallet,
    createSignerProvider: jest.fn(() => ({
      getWallet: mockGetWallet,
    })),
    KMSSignerProvider: jest.fn(),
    EnvVarSignerProvider: jest.fn(),
  };
});

import * as kmsSigner from '../../src/services/kms-signer.service';
import { BlockchainTransactionService } from '../../src/services/blockchain-transaction.service';
import { ProviderManager } from '../../src/utils/provider-manager';

// Access the spy through the mocked module
const getWalletSpy = (kmsSigner as any).__mockGetWallet as jest.Mock;

// Valid checksummed address (ethers v6 is strict about checksums)
const VALID_ADDRESS = '0xe8acf143AFbF8B1371A20ea934D334180190Eac1';

function createMockProviderManager() {
  const pm = new ProviderManager();
  pm.addProviders('polygon', ['https://polygon-test.com']);
  pm.addProviders('ethereum', ['https://ethereum-test.com']);
  return pm;
}

describe('Wallet network-aware caching', () => {
  beforeEach(() => {
    process.env.POLYGON_RPC_URL = 'https://polygon-test.com';
    process.env.ETHEREUM_RPC_URL = 'https://ethereum-test.com';
    getWalletSpy.mockClear();
    mockTransferFn.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return different wallet instances for different networks', async () => {
    const service = new BlockchainTransactionService({
      providerManager: createMockProviderManager(),
    });

    await service.executeRefund({
      network: 'polygon',
      token: 'USDC',
      recipientAddress: VALID_ADDRESS,
      amount: 10,
    });

    await service.executeRefund({
      network: 'ethereum',
      token: 'USDC',
      recipientAddress: VALID_ADDRESS,
      amount: 10,
    });

    // getWallet must be called once per distinct network
    expect(getWalletSpy).toHaveBeenCalledTimes(2);
    expect(getWalletSpy).toHaveBeenCalledWith('polygon');
    expect(getWalletSpy).toHaveBeenCalledWith('ethereum');
  });

  it('should cache and reuse wallet for the same network', async () => {
    const service = new BlockchainTransactionService({
      providerManager: createMockProviderManager(),
    });

    await service.executeRefund({
      network: 'polygon',
      token: 'USDC',
      recipientAddress: VALID_ADDRESS,
      amount: 10,
    });

    await service.executeRefund({
      network: 'polygon',
      token: 'USDT',
      recipientAddress: VALID_ADDRESS,
      amount: 20,
    });

    // Only one call to getWallet -- the second reuses the cache
    expect(getWalletSpy).toHaveBeenCalledTimes(1);
    expect(getWalletSpy).toHaveBeenCalledWith('polygon');
  });

  it('should cache per network independently', async () => {
    const service = new BlockchainTransactionService({
      providerManager: createMockProviderManager(),
    });

    // polygon -> ethereum -> polygon -> ethereum
    await service.executeRefund({
      network: 'polygon',
      token: 'USDC',
      recipientAddress: VALID_ADDRESS,
      amount: 10,
    });

    await service.executeRefund({
      network: 'ethereum',
      token: 'USDC',
      recipientAddress: VALID_ADDRESS,
      amount: 10,
    });

    await service.executeRefund({
      network: 'polygon',
      token: 'USDT',
      recipientAddress: VALID_ADDRESS,
      amount: 5,
    });

    await service.executeRefund({
      network: 'ethereum',
      token: 'USDT',
      recipientAddress: VALID_ADDRESS,
      amount: 5,
    });

    // Exactly 2 getWallet calls: one per unique network
    expect(getWalletSpy).toHaveBeenCalledTimes(2);
    expect(getWalletSpy).toHaveBeenCalledWith('polygon');
    expect(getWalletSpy).toHaveBeenCalledWith('ethereum');
  });
});
