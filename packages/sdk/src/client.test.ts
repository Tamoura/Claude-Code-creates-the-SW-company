import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StablecoinGateway } from './client';
import { ApiError, ConfigurationError, TimeoutError } from './errors';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('StablecoinGateway', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const gateway = new StablecoinGateway('test-api-key');
      expect(gateway).toBeInstanceOf(StablecoinGateway);
    });

    it('should throw ConfigurationError for empty API key', () => {
      expect(() => new StablecoinGateway('')).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for whitespace-only API key', () => {
      expect(() => new StablecoinGateway('   ')).toThrow(ConfigurationError);
      expect(() => new StablecoinGateway('   ')).toThrow('API key cannot be empty');
    });

    it('should throw ConfigurationError for null API key', () => {
      expect(() => new StablecoinGateway(null as unknown as string)).toThrow(
        ConfigurationError
      );
    });

    it('should accept custom options', () => {
      const gateway = new StablecoinGateway('test-key', {
        baseUrl: 'https://custom.api.com/',
        timeout: 60000,
        retries: 5,
      });
      expect(gateway).toBeInstanceOf(StablecoinGateway);
    });
  });

  describe('createPaymentSession', () => {
    it('should create payment session successfully', async () => {
      const mockSession = {
        id: 'ps_test123',
        amount: 100,
        currency: 'USD',
        status: 'PENDING',
        checkout_url: 'https://checkout.example.com/ps_test123',
        created_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-08T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const gateway = new StablecoinGateway('test-key');
      const session = await gateway.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      });

      expect(session).toEqual(mockSession);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/payment-sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            detail: 'Invalid amount',
            code: 'VALIDATION_ERROR',
          }),
      });

      const gateway = new StablecoinGateway('test-key');

      try {
        await gateway.createPaymentSession({
          amount: -100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).isValidationError()).toBe(true);
      }
    });

    it('should pass all parameters to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'ps_test' }),
      });

      const gateway = new StablecoinGateway('test-key');
      await gateway.createPaymentSession({
        amount: 100,
        currency: 'EUR',
        description: 'Test payment',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { orderId: '123' },
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body).toEqual({
        amount: 100,
        currency: 'EUR',
        description: 'Test payment',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { orderId: '123' },
      });
    });
  });

  describe('getPaymentSession', () => {
    it('should get payment session by ID', async () => {
      const mockSession = {
        id: 'ps_test123',
        amount: 100,
        status: 'COMPLETED',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const gateway = new StablecoinGateway('test-key');
      const session = await gateway.getPaymentSession('ps_test123');

      expect(session).toEqual(mockSession);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/payment-sessions/ps_test123'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should throw ConfigurationError for empty ID', async () => {
      const gateway = new StablecoinGateway('test-key');

      await expect(gateway.getPaymentSession('')).rejects.toThrow(
        ConfigurationError
      );
    });

    it('should handle not found errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            detail: 'Payment session not found',
            code: 'NOT_FOUND',
          }),
      });

      const gateway = new StablecoinGateway('test-key');

      try {
        await gateway.getPaymentSession('ps_nonexistent');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isNotFoundError()).toBe(true);
      }
    });
  });

  describe('listPaymentSessions', () => {
    it('should list payment sessions with pagination', async () => {
      const mockResponse = {
        data: [
          { id: 'ps_1', amount: 100 },
          { id: 'ps_2', amount: 200 },
        ],
        pagination: {
          total: 10,
          limit: 2,
          offset: 0,
          has_more: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const gateway = new StablecoinGateway('test-key');
      const result = await gateway.listPaymentSessions({
        limit: 2,
        offset: 0,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should filter by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: [], pagination: { total: 0 } }),
      });

      const gateway = new StablecoinGateway('test-key');
      await gateway.listPaymentSessions({ status: 'PENDING' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('status=PENDING');
    });

    it('should work without parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: [], pagination: { total: 0 } }),
      });

      const gateway = new StablecoinGateway('test-key');
      await gateway.listPaymentSessions();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('createRefund', () => {
    it('should create full refund', async () => {
      const mockRefund = {
        id: 'ref_test123',
        payment_id: 'ps_test123',
        amount: 100,
        status: 'PENDING',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefund),
      });

      const gateway = new StablecoinGateway('test-key');
      const refund = await gateway.createRefund('ps_test123', {
        reason: 'Customer request',
      });

      expect(refund).toEqual(mockRefund);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.payment_id).toBe('ps_test123');
      expect(body.reason).toBe('Customer request');
    });

    it('should create partial refund', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'ref_test' }),
      });

      const gateway = new StablecoinGateway('test-key');
      await gateway.createRefund('ps_test123', {
        amount: 50,
        reason: 'Partial refund',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.amount).toBe(50);
    });

    it('should throw ConfigurationError for empty payment ID', async () => {
      const gateway = new StablecoinGateway('test-key');

      await expect(gateway.createRefund('')).rejects.toThrow(
        ConfigurationError
      );
    });
  });

  describe('getRefund', () => {
    it('should get refund by ID', async () => {
      const mockRefund = {
        id: 'ref_test123',
        status: 'COMPLETED',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefund),
      });

      const gateway = new StablecoinGateway('test-key');
      const refund = await gateway.getRefund('ref_test123');

      expect(refund).toEqual(mockRefund);
    });

    it('should throw ConfigurationError for empty ID', async () => {
      const gateway = new StablecoinGateway('test-key');

      await expect(gateway.getRefund('')).rejects.toThrow(ConfigurationError);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            detail: 'Invalid API key',
            code: 'UNAUTHORIZED',
          }),
      });

      const gateway = new StablecoinGateway('invalid-key');

      try {
        await gateway.listPaymentSessions();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isAuthenticationError()).toBe(true);
      }
    });

    it('should handle rate limit errors with retry', async () => {
      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () =>
            Promise.resolve({
              detail: 'Rate limit exceeded',
              code: 'RATE_LIMIT',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const gateway = new StablecoinGateway('test-key', { retries: 1 });
      const result = await gateway.listPaymentSessions();

      expect(result).toEqual({ data: [] });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle server errors with retry', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () =>
              Promise.resolve({
                detail: 'Internal server error',
                code: 'SERVER_ERROR',
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'ps_test' }),
        });
      });

      const gateway = new StablecoinGateway('test-key', { retries: 1 });
      const session = await gateway.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      });

      expect(session).toEqual({ id: 'ps_test' });
      expect(callCount).toBe(2);
    }, 10000);

    it('should not retry for validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            detail: 'Invalid request',
            code: 'VALIDATION_ERROR',
          }),
      });

      const gateway = new StablecoinGateway('test-key', { retries: 3 });

      await expect(
        gateway.createPaymentSession({
          amount: -100,
          merchant_address: 'invalid',
        })
      ).rejects.toThrow(ApiError);

      // Should only be called once (no retries for 4xx except 429)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    it('should convert AbortError to TimeoutError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const gateway = new StablecoinGateway('test-key', { timeout: 100, retries: 0 });

      try {
        await gateway.listPaymentSessions();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }
    });
  });
});
