import { describe, it, expect, beforeEach } from 'vitest';
import { simulateTransaction, isMockTransactionMode, processTransaction } from './transactions';
import { createPayment, getPayment } from './payments';
import { resetWallet } from './wallet';

describe('simulateTransaction', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates payment to confirming then complete', async () => {
    const payment = createPayment(100);

    const txHashPromise = simulateTransaction(payment.id, payment.amount);

    // Should be confirming
    const confirming = getPayment(payment.id);
    expect(confirming?.status).toBe('confirming');

    // Wait for completion
    const txHash = await txHashPromise;

    // Should be complete
    const complete = getPayment(payment.id);
    expect(complete?.status).toBe('complete');
    expect(complete?.txHash).toBe(txHash);
    expect(complete?.completedAt).toBeTruthy();
  });

  it('returns a valid transaction hash', async () => {
    const payment = createPayment(100);
    const txHash = await simulateTransaction(payment.id, payment.amount);

    expect(txHash).toMatch(/^0x[a-fA-F0-9]+$/);
  });
});

describe('isMockTransactionMode', () => {
  it('returns true in test environment with mock enabled', () => {
    // Test setup configures DEV=true, VITE_USE_MOCK=true
    expect(isMockTransactionMode()).toBe(true);
  });
});

describe('processTransaction', () => {
  beforeEach(() => {
    localStorage.clear();
    resetWallet();
  });

  it('uses simulateTransaction in mock mode', async () => {
    const payment = createPayment(100);

    // In mock mode, should use simulation
    expect(isMockTransactionMode()).toBe(true);

    const txHash = await processTransaction(payment.id, payment.amount, '0x123');

    expect(txHash).toMatch(/^0x[a-fA-F0-9]+$/);

    const complete = getPayment(payment.id);
    expect(complete?.status).toBe('complete');
  });
});

describe('mock gating', () => {
  it('mock mode is enabled in test environment', () => {
    expect(isMockTransactionMode()).toBe(true);
  });

  it('simulateTransaction works in mock mode', async () => {
    const payment = createPayment(50);
    const txHash = await simulateTransaction(payment.id, payment.amount);

    expect(txHash).toBeTruthy();
    expect(txHash).toMatch(/^0x/);
  });
});
