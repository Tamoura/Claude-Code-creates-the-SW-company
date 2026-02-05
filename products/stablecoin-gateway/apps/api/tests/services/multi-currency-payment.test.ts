/**
 * Multi-Currency Payment Tests
 *
 * Tests that payment sessions can be created with EUR/GBP currencies,
 * with automatic conversion to USD stablecoin equivalent.
 *
 * Test cases:
 * 1. Payment in EUR converts to USD and stores original amount
 * 2. Payment in GBP converts to USD and stores original amount
 * 3. Payment in USD stores without conversion (original fields null)
 * 4. toResponse includes original_amount, original_currency, exchange_rate
 * 5. Validation schema accepts EUR, GBP, USD
 * 6. Validation schema rejects unsupported currencies
 */

import { PaymentService } from '../../src/services/payment.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createPaymentSessionSchema } from '../../src/utils/validation';

// Mock dependencies
jest.mock('../../src/services/webhook-delivery.service', () => ({
  WebhookDeliveryService: jest.fn().mockImplementation(() => ({
    queueWebhook: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/services/exchange-rate.service', () => ({
  ExchangeRateService: jest.fn().mockImplementation(() => ({
    convert: jest.fn().mockImplementation(async (amount: number, from: string, to: string) => {
      if (from === 'USD') return { convertedAmount: amount, rate: 1, sourceCurrency: from, targetCurrency: to };
      if (from === 'EUR') return { convertedAmount: parseFloat((amount / 0.92).toFixed(6)), rate: 0.92, sourceCurrency: from, targetCurrency: to };
      if (from === 'GBP') return { convertedAmount: parseFloat((amount / 0.79).toFixed(6)), rate: 0.79, sourceCurrency: from, targetCurrency: to };
      throw new Error(`Unsupported currency: ${from}`);
    }),
  })),
}));

jest.mock('../../src/utils/crypto', () => ({
  generatePaymentSessionId: jest.fn().mockReturnValue('ps_test_123'),
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  const mockPrisma = {
    paymentSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  return {
    ...actual,
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('Multi-Currency Payment Creation', () => {
  let paymentService: PaymentService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
    paymentService = new PaymentService(mockPrisma);
  });

  describe('EUR payment session', () => {
    it('should convert EUR amount to USD and store original currency data', async () => {
      const now = new Date();
      mockPrisma.paymentSession.create.mockResolvedValue({
        id: 'ps_test_123',
        userId: 'user_1',
        amount: new Decimal('108.695652'),
        currency: 'USD',
        description: 'Test EUR payment',
        originalAmount: new Decimal('100'),
        originalCurrency: 'EUR',
        exchangeRate: new Decimal('0.92'),
        network: 'polygon',
        token: 'USDC',
        status: 'PENDING',
        merchantAddress: '0x1234567890123456789012345678901234567890',
        customerAddress: null,
        txHash: null,
        blockNumber: null,
        confirmations: 0,
        successUrl: null,
        cancelUrl: null,
        metadata: null,
        idempotencyKey: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        completedAt: null,
      });

      const session = await paymentService.createPaymentSession('user_1', {
        amount: 100,
        currency: 'EUR',
        description: 'Test EUR payment',
        merchant_address: '0x1234567890123456789012345678901234567890',
      });

      // Verify the create call stored converted USD amount
      const createCall = mockPrisma.paymentSession.create.mock.calls[0][0];
      expect(createCall.data.amount).toBeCloseTo(108.695652, 4);
      expect(createCall.data.currency).toBe('USD');
      expect(createCall.data.originalAmount).toBe(100);
      expect(createCall.data.originalCurrency).toBe('EUR');
      expect(createCall.data.exchangeRate).toBe(0.92);
    });
  });

  describe('GBP payment session', () => {
    it('should convert GBP amount to USD and store original currency data', async () => {
      const now = new Date();
      mockPrisma.paymentSession.create.mockResolvedValue({
        id: 'ps_test_123',
        userId: 'user_1',
        amount: new Decimal('126.582278'),
        currency: 'USD',
        originalAmount: new Decimal('100'),
        originalCurrency: 'GBP',
        exchangeRate: new Decimal('0.79'),
        network: 'polygon',
        token: 'USDC',
        status: 'PENDING',
        merchantAddress: '0x1234567890123456789012345678901234567890',
        customerAddress: null,
        txHash: null,
        blockNumber: null,
        confirmations: 0,
        description: null,
        successUrl: null,
        cancelUrl: null,
        metadata: null,
        idempotencyKey: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        completedAt: null,
      });

      await paymentService.createPaymentSession('user_1', {
        amount: 100,
        currency: 'GBP',
        merchant_address: '0x1234567890123456789012345678901234567890',
      });

      const createCall = mockPrisma.paymentSession.create.mock.calls[0][0];
      expect(createCall.data.amount).toBeCloseTo(126.582278, 4);
      expect(createCall.data.currency).toBe('USD');
      expect(createCall.data.originalAmount).toBe(100);
      expect(createCall.data.originalCurrency).toBe('GBP');
      expect(createCall.data.exchangeRate).toBe(0.79);
    });
  });

  describe('USD payment session (no conversion)', () => {
    it('should store USD payment without conversion fields', async () => {
      const now = new Date();
      mockPrisma.paymentSession.create.mockResolvedValue({
        id: 'ps_test_123',
        userId: 'user_1',
        amount: new Decimal('50'),
        currency: 'USD',
        originalAmount: null,
        originalCurrency: null,
        exchangeRate: null,
        network: 'polygon',
        token: 'USDC',
        status: 'PENDING',
        merchantAddress: '0x1234567890123456789012345678901234567890',
        customerAddress: null,
        txHash: null,
        blockNumber: null,
        confirmations: 0,
        description: null,
        successUrl: null,
        cancelUrl: null,
        metadata: null,
        idempotencyKey: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        completedAt: null,
      });

      await paymentService.createPaymentSession('user_1', {
        amount: 50,
        currency: 'USD',
        merchant_address: '0x1234567890123456789012345678901234567890',
      });

      const createCall = mockPrisma.paymentSession.create.mock.calls[0][0];
      expect(createCall.data.amount).toBe(50);
      expect(createCall.data.currency).toBe('USD');
      expect(createCall.data.originalAmount).toBeNull();
      expect(createCall.data.originalCurrency).toBeNull();
      expect(createCall.data.exchangeRate).toBeNull();
    });
  });

  describe('toResponse', () => {
    it('should include original_amount, original_currency, exchange_rate for EUR payments', () => {
      const now = new Date();
      const session: any = {
        id: 'ps_test_123',
        userId: 'user_1',
        amount: new Decimal('108.70'),
        currency: 'USD',
        originalAmount: new Decimal('100'),
        originalCurrency: 'EUR',
        exchangeRate: new Decimal('0.92'),
        description: null,
        network: 'polygon',
        token: 'USDC',
        status: 'PENDING',
        merchantAddress: '0xAbCd',
        customerAddress: null,
        txHash: null,
        blockNumber: null,
        confirmations: 0,
        successUrl: null,
        cancelUrl: null,
        metadata: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        completedAt: null,
      };

      const response = paymentService.toResponse(session, 'http://localhost:3104');

      expect(response.amount).toBe(108.70);
      expect(response.currency).toBe('USD');
      expect(response.original_amount).toBe(100);
      expect(response.original_currency).toBe('EUR');
      expect(response.exchange_rate).toBe(0.92);
      expect(response.checkout_url).toBe('http://localhost:3104/pay/ps_test_123');
    });

    it('should return null for original fields on USD payments', () => {
      const now = new Date();
      const session: any = {
        id: 'ps_test_456',
        userId: 'user_1',
        amount: new Decimal('50'),
        currency: 'USD',
        originalAmount: null,
        originalCurrency: null,
        exchangeRate: null,
        description: null,
        network: 'polygon',
        token: 'USDC',
        status: 'PENDING',
        merchantAddress: '0xAbCd',
        customerAddress: null,
        txHash: null,
        blockNumber: null,
        confirmations: 0,
        successUrl: null,
        cancelUrl: null,
        metadata: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        completedAt: null,
      };

      const response = paymentService.toResponse(session, 'http://localhost:3104');

      expect(response.amount).toBe(50);
      expect(response.currency).toBe('USD');
      expect(response.original_amount).toBeNull();
      expect(response.original_currency).toBeNull();
      expect(response.exchange_rate).toBeNull();
    });
  });
});

describe('Validation Schema - Multi-Currency', () => {
  it('should accept EUR currency', () => {
    const result = createPaymentSessionSchema.parse({
      amount: 100,
      currency: 'EUR',
      merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    });
    expect(result.currency).toBe('EUR');
  });

  it('should accept GBP currency', () => {
    const result = createPaymentSessionSchema.parse({
      amount: 100,
      currency: 'GBP',
      merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    });
    expect(result.currency).toBe('GBP');
  });

  it('should accept USD currency', () => {
    const result = createPaymentSessionSchema.parse({
      amount: 100,
      currency: 'USD',
      merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    });
    expect(result.currency).toBe('USD');
  });

  it('should default to USD when currency not provided', () => {
    const result = createPaymentSessionSchema.parse({
      amount: 100,
      merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    });
    expect(result.currency).toBe('USD');
  });

  it('should reject unsupported currencies', () => {
    expect(() =>
      createPaymentSessionSchema.parse({
        amount: 100,
        currency: 'JPY',
        merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      })
    ).toThrow();
  });

  it('should accept amounts up to 100,000 for non-USD currencies', () => {
    const result = createPaymentSessionSchema.parse({
      amount: 99999,
      currency: 'EUR',
      merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    });
    expect(result.amount).toBe(99999);
  });
});
