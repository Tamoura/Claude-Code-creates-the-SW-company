import { describe, it, expect, beforeEach } from 'vitest';
import { mockWallet, resetWallet } from './wallet';

describe('mockWallet', () => {
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
