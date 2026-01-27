import { describe, it, expect, beforeEach } from 'vitest';
import { simulateTransaction } from './transactions';
import { createPayment, getPayment } from './payments';

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
