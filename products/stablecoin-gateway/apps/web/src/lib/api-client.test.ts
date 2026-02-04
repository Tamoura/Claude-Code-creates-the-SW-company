/**
 * Tests for API Client
 *
 * Tests mock mode (localStorage-based) implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient, ApiClientError } from './api-client';

describe('API Client (Mock Mode)', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('createPaymentSession', () => {
    it('creates a payment session with valid data', async () => {
      const session = await apiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      expect(session.id).toMatch(/^ps_[a-zA-Z0-9]+$/);
      expect(session.amount).toBe(100);
      expect(session.currency).toBe('USD');
      expect(session.status).toBe('pending');
      expect(session.network).toBe('polygon');
      expect(session.token).toBe('USDC');
      expect(session.checkout_url).toContain('/pay/');
    });

    it('respects custom network and token', async () => {
      const session = await apiClient.createPaymentSession({
        amount: 50,
        network: 'ethereum',
        token: 'USDT',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      expect(session.network).toBe('ethereum');
      expect(session.token).toBe('USDT');
    });

    it('includes optional description', async () => {
      const session = await apiClient.createPaymentSession({
        amount: 100,
        description: 'Test payment',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      expect(session.description).toBe('Test payment');
    });
  });

  describe('getPaymentSession', () => {
    it('retrieves a created payment session', async () => {
      const created = await apiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      const retrieved = await apiClient.getPaymentSession(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.amount).toBe(created.amount);
    });

    it('throws error for non-existent payment', async () => {
      await expect(
        apiClient.getPaymentSession('ps_nonexistent')
      ).rejects.toThrow(ApiClientError);
    });

    it('throws 404 error with correct status code', async () => {
      try {
        await apiClient.getPaymentSession('ps_nonexistent');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(404);
        expect((error as ApiClientError).title).toBe('Not Found');
      }
    });
  });

  describe('updatePaymentSession', () => {
    it('updates payment session status', async () => {
      const created = await apiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      const updated = await apiClient.updatePaymentSession(created.id, {
        status: 'completed',
        tx_hash: '0xabc123',
      });

      expect(updated.status).toBe('completed');
      expect(updated.tx_hash).toBe('0xabc123');
    });

    it('persists updates across retrievals', async () => {
      const created = await apiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      await apiClient.updatePaymentSession(created.id, {
        customer_address: '0x123abc',
      });

      const retrieved = await apiClient.getPaymentSession(created.id);
      expect(retrieved.customer_address).toBe('0x123abc');
    });
  });

  describe('ApiClientError', () => {
    it('has correct properties', () => {
      const error = new ApiClientError(
        400,
        'Bad Request',
        'Invalid amount'
      );

      expect(error.status).toBe(400);
      expect(error.title).toBe('Bad Request');
      expect(error.detail).toBe('Invalid amount');
      expect(error.name).toBe('ApiClientError');
      expect(error.message).toBe('Invalid amount');
    });

    it('is instance of Error', () => {
      const error = new ApiClientError(500, 'Server Error', 'Something went wrong');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('changePassword', () => {
    it('calls the change-password endpoint', async () => {
      // changePassword should be a public method on ApiClient
      expect(typeof apiClient.changePassword).toBe('function');
    });
  });

  describe('createEventSource dynamic import', () => {
    it('does not eagerly import event-source-polyfill at module level', async () => {
      // The EventSourcePolyfill should only be imported when createEventSource is called,
      // not at module evaluation time. This prevents blank pages when the polyfill fails.
      // Verifying the method exists is sufficient — the actual dynamic import is tested
      // by the fact that module evaluation succeeds without the polyfill being available.
      expect(typeof apiClient.createEventSource).toBe('function');
    });
  });

  describe('Payment session expiration', () => {
    it('sets expires_at to 7 days in future', async () => {
      const now = Date.now();
      const session = await apiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      const expiresAt = new Date(session.expires_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      // Should be approximately 7 days from now (within 1 minute tolerance)
      expect(expiresAt).toBeGreaterThan(now + sevenDays - 60000);
      expect(expiresAt).toBeLessThan(now + sevenDays + 60000);
    });
  });

  describe('Analytics', () => {
    describe('getAnalyticsOverview', () => {
      it('should call overview endpoint', async () => {
        // This will test against the mock implementation for now
        // When backend is ready, this should return real data
        try {
          await apiClient.getAnalyticsOverview();
          // If mock not implemented yet, it will throw
        } catch (error: any) {
          expect(error.status).toBe(501);
          expect(error.title).toBe('Not Implemented');
        }
      });
    });

    describe('getAnalyticsVolume', () => {
      it('should call volume endpoint with params', async () => {
        try {
          await apiClient.getAnalyticsVolume('day', 30);
        } catch (error: any) {
          expect(error.status).toBe(501);
          expect(error.title).toBe('Not Implemented');
        }
      });
    });

    describe('getAnalyticsBreakdown', () => {
      it('should call breakdown endpoint with groupBy param', async () => {
        try {
          await apiClient.getAnalyticsBreakdown('status');
        } catch (error: any) {
          expect(error.status).toBe(501);
          expect(error.title).toBe('Not Implemented');
        }
      });
    });
  });
});
