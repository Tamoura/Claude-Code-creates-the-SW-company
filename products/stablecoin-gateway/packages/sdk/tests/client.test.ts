import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StablecoinGateway } from '../src/client';
import { ApiError } from '../src/errors';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe('StablecoinGateway', () => {
  let client: StablecoinGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new StablecoinGateway('sk_test_abc123', { baseUrl: 'https://api.test.com' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws when API key is missing', () => {
      expect(() => new StablecoinGateway('')).toThrow('API key is required');
    });

    it('accepts custom base URL', () => {
      const custom = new StablecoinGateway('sk_test_key', { baseUrl: 'https://custom.api.com' });
      expect(custom).toBeInstanceOf(StablecoinGateway);
    });

    it('strips trailing slashes from base URL', async () => {
      const custom = new StablecoinGateway('sk_test_key', { baseUrl: 'https://api.test.com///' });
      const mockSession = { id: 'ps_1', amount: 100 };
      mockFetch.mockResolvedValue(jsonResponse(mockSession));

      await custom.getPaymentSession('ps_1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/payment-sessions/ps_1',
        expect.any(Object),
      );
    });
  });

  describe('createPaymentSession', () => {
    const mockSession = {
      id: 'ps_abc123',
      amount: 100,
      currency: 'USD',
      status: 'PENDING',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x1234',
      checkout_url: 'https://checkout.test.com/ps_abc123',
    };

    it('creates a payment session', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockSession));

      const result = await client.createPaymentSession({
        amount: 100,
        merchant_address: '0x1234',
      });

      expect(result).toEqual(mockSession);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/payment-sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: 100, merchant_address: '0x1234' }),
        }),
      );
    });

    it('sends Authorization header', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockSession));

      await client.createPaymentSession({
        amount: 100,
        merchant_address: '0x1234',
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer sk_test_abc123');
    });

    it('sends Idempotency-Key header when provided', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockSession));

      await client.createPaymentSession({
        amount: 100,
        merchant_address: '0x1234',
        idempotency_key: 'idem_123',
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Idempotency-Key']).toBe('idem_123');
      // Idempotency key should NOT be in the body
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.idempotency_key).toBeUndefined();
    });

    it('sends all optional parameters', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockSession));

      await client.createPaymentSession({
        amount: 500,
        currency: 'USD',
        description: 'Test payment',
        network: 'ethereum',
        token: 'USDT',
        merchant_address: '0xabcd',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { order_id: '42' },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        amount: 500,
        currency: 'USD',
        description: 'Test payment',
        network: 'ethereum',
        token: 'USDT',
        merchant_address: '0xabcd',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { order_id: '42' },
      });
    });
  });

  describe('getPaymentSession', () => {
    it('fetches a payment session by ID', async () => {
      const mockSession = { id: 'ps_123', amount: 250, status: 'COMPLETED' };
      mockFetch.mockResolvedValue(jsonResponse(mockSession));

      const result = await client.getPaymentSession('ps_123');

      expect(result).toEqual(mockSession);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/payment-sessions/ps_123',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('encodes special characters in ID', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 'ps/special' }));

      await client.getPaymentSession('ps/special');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/payment-sessions/ps%2Fspecial',
        expect.any(Object),
      );
    });
  });

  describe('listPaymentSessions', () => {
    const mockList = {
      data: [{ id: 'ps_1' }, { id: 'ps_2' }],
      pagination: { total: 2, has_more: false, limit: 50, offset: 0 },
    };

    it('lists payment sessions without params', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockList));

      const result = await client.listPaymentSessions();

      expect(result).toEqual(mockList);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/payment-sessions',
        expect.any(Object),
      );
    });

    it('builds query string from params', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockList));

      await client.listPaymentSessions({
        limit: 10,
        offset: 20,
        status: 'COMPLETED',
        network: 'polygon',
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
      expect(url).toContain('status=COMPLETED');
      expect(url).toContain('network=polygon');
    });

    it('omits undefined params from query string', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockList));

      await client.listPaymentSessions({ limit: 10 });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=10');
      expect(url).not.toContain('offset');
      expect(url).not.toContain('status');
    });
  });

  describe('createRefund', () => {
    const mockRefund = {
      id: 'ref_123',
      payment_session_id: 'ps_abc',
      amount: 50,
      status: 'PENDING',
    };

    it('creates a refund', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockRefund));

      const result = await client.createRefund({
        payment_session_id: 'ps_abc',
        amount: 50,
      });

      expect(result).toEqual(mockRefund);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ payment_session_id: 'ps_abc', amount: 50 });
    });

    it('sends reason and idempotency key', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockRefund));

      await client.createRefund({
        payment_session_id: 'ps_abc',
        amount: 50,
        reason: 'Customer request',
        idempotency_key: 'ref_idem_1',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.reason).toBe('Customer request');
      expect(body.idempotency_key).toBeUndefined();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Idempotency-Key']).toBe('ref_idem_1');
    });
  });

  describe('getRefund', () => {
    it('fetches a refund by ID', async () => {
      const mockRefund = { id: 'ref_123', amount: 50, status: 'COMPLETED' };
      mockFetch.mockResolvedValue(jsonResponse(mockRefund));

      const result = await client.getRefund('ref_123');

      expect(result).toEqual(mockRefund);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/refunds/ref_123',
        expect.any(Object),
      );
    });
  });

  describe('listRefunds', () => {
    it('lists refunds with filtering', async () => {
      const mockList = {
        data: [{ id: 'ref_1' }],
        pagination: { total: 1, has_more: false, limit: 50, offset: 0 },
      };
      mockFetch.mockResolvedValue(jsonResponse(mockList));

      const result = await client.listRefunds({
        payment_session_id: 'ps_abc',
        status: 'COMPLETED',
        limit: 10,
      });

      expect(result).toEqual(mockList);
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('payment_session_id=ps_abc');
      expect(url).toContain('status=COMPLETED');
      expect(url).toContain('limit=10');
    });
  });

  describe('error handling', () => {
    it('throws ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          { error: { code: 'VALIDATION_ERROR', message: 'Amount is required' } },
          400,
        ),
      );

      await expect(
        client.createPaymentSession({ amount: 0, merchant_address: '' }),
      ).rejects.toThrow(ApiError);
    });

    it('includes status code, code, and message in ApiError', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          { error: { code: 'NOT_FOUND', message: 'Payment session not found' } },
          404,
        ),
      );

      try {
        await client.getPaymentSession('nonexistent');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.statusCode).toBe(404);
        expect(apiErr.code).toBe('NOT_FOUND');
        expect(apiErr.message).toBe('Payment session not found');
      }
    });

    it('handles non-JSON error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.resolve('Bad Gateway'),
      } as Response);

      try {
        await client.getPaymentSession('ps_1');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.statusCode).toBe(502);
        expect(apiErr.code).toBe('UNKNOWN_ERROR');
      }
    });
  });
});
