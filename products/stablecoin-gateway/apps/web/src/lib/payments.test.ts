import { describe, it, expect, beforeEach } from 'vitest';
import { createPayment, getPayment, updatePayment, getAllPayments } from './payments';

describe('payments', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createPayment', () => {
    it('creates a payment with pending status', () => {
      const payment = createPayment(100);

      expect(payment).toMatchObject({
        amount: 100,
        status: 'pending',
      });
      expect(payment.id).toBeTruthy();
      expect(payment.createdAt).toBeTruthy();
    });

    it('stores payment in localStorage', () => {
      const payment = createPayment(100);
      const stored = getPayment(payment.id);

      expect(stored).toEqual(payment);
    });
  });

  describe('getPayment', () => {
    it('returns null for non-existent payment', () => {
      const payment = getPayment('non-existent-id');
      expect(payment).toBeNull();
    });

    it('returns payment if it exists', () => {
      const created = createPayment(50);
      const retrieved = getPayment(created.id);

      expect(retrieved).toEqual(created);
    });
  });

  describe('updatePayment', () => {
    it('updates payment status', () => {
      const payment = createPayment(100);
      updatePayment(payment.id, { status: 'confirming' });

      const updated = getPayment(payment.id);
      expect(updated?.status).toBe('confirming');
    });

    it('updates transaction hash', () => {
      const payment = createPayment(100);
      const txHash = '0xabc123';
      updatePayment(payment.id, { txHash });

      const updated = getPayment(payment.id);
      expect(updated?.txHash).toBe(txHash);
    });
  });

  describe('getAllPayments', () => {
    it('returns empty array when no payments', () => {
      const payments = getAllPayments();
      expect(payments).toEqual([]);
    });

    it('returns all payments', () => {
      const payment1 = createPayment(100);
      const payment2 = createPayment(200);

      const payments = getAllPayments();
      expect(payments).toHaveLength(2);
      expect(payments).toContainEqual(payment1);
      expect(payments).toContainEqual(payment2);
    });
  });
});
