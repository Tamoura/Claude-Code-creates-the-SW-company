import { describe, it, expect, beforeEach } from 'vitest';
import { mockWallet, resetWallet, getWallet, isMockMode, isProductionMode } from './wallet';

describe('mockWallet (legacy)', () => {
  beforeEach(() => {
    resetWallet();
  });

  it('starts disconnected', () => {
    expect(mockWallet.connected).toBe(false);
  });

  it('has a mock address', () => {
    expect(mockWallet.address).toBeTruthy();
    expect(mockWallet.address).toMatch(/^0x[a-fA-F0-9]+$/);
  });

  it('has a mock balance', () => {
    expect(mockWallet.balance).toBeGreaterThan(0);
  });

  it('connects after delay', async () => {
    const address = await mockWallet.connect();

    expect(mockWallet.connected).toBe(true);
    expect(address).toBe(mockWallet.address);
  });

  it('sends transaction and returns hash', async () => {
    await mockWallet.connect();
    const result = await mockWallet.sendTransaction(100);

    expect(result.status).toBe('success');
    expect(result.hash).toMatch(/^0x[a-fA-F0-9]+$/);
  });

  it('deducts balance after transaction', async () => {
    await mockWallet.connect();
    const initialBalance = mockWallet.balance;
    await mockWallet.sendTransaction(100);

    expect(mockWallet.balance).toBe(initialBalance - 100);
  });
});

describe('getWallet', () => {
  beforeEach(() => {
    resetWallet();
  });

  it('returns a wallet provider with required interface', () => {
    const wallet = getWallet();

    expect(wallet).toHaveProperty('address');
    expect(wallet).toHaveProperty('balance');
    expect(wallet).toHaveProperty('connected');
    expect(typeof wallet.connect).toBe('function');
    expect(typeof wallet.sendTransaction).toBe('function');
    expect(typeof wallet.disconnect).toBe('function');
  });

  it('returns mock wallet in test environment with mock enabled', () => {
    const wallet = getWallet();

    // In test setup, VITE_USE_MOCK=true and DEV=true
    expect(isMockMode()).toBe(true);
    expect(wallet.balance).toBe(1000); // MockWallet default
  });
});

describe('isMockMode', () => {
  it('returns true when VITE_USE_MOCK is true and in dev mode', () => {
    // Test setup configures DEV=true, VITE_USE_MOCK=true
    expect(isMockMode()).toBe(true);
  });
});

describe('isProductionMode', () => {
  it('returns false in test environment', () => {
    // Test setup configures PROD=false
    expect(isProductionMode()).toBe(false);
  });
});

describe('resetWallet', () => {
  beforeEach(() => {
    resetWallet();
  });

  it('resets wallet state', async () => {
    const wallet = getWallet();
    await wallet.connect();
    await wallet.sendTransaction(100);

    expect(wallet.balance).toBe(900);
    expect(wallet.connected).toBe(true);

    resetWallet();

    expect(wallet.balance).toBe(1000);
    expect(wallet.connected).toBe(false);
  });
});

describe('WalletProvider interface', () => {
  beforeEach(() => {
    resetWallet();
  });

  it('throws on insufficient balance', async () => {
    const wallet = getWallet();
    await wallet.connect();

    await expect(wallet.sendTransaction(2000)).rejects.toThrow('Insufficient balance');
  });

  it('throws when not connected', async () => {
    const wallet = getWallet();
    // Ensure wallet is disconnected
    wallet.disconnect();

    await expect(wallet.sendTransaction(100)).rejects.toThrow('Wallet not connected');
  });

  it('disconnects properly', async () => {
    const wallet = getWallet();
    await wallet.connect();
    expect(wallet.connected).toBe(true);

    wallet.disconnect();
    expect(wallet.connected).toBe(false);
  });
});
