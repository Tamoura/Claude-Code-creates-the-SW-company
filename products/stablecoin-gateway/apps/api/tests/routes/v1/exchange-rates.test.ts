/**
 * Exchange Rates Route Tests
 *
 * Tests the HTTP layer for exchange rate endpoints:
 * - GET /v1/exchange-rates (list rates — public)
 * - GET /v1/exchange-rates/convert (currency conversion — public)
 * - POST /v1/exchange-rates (set rate — admin only)
 */

import { ExchangeRateService } from '../../../src/services/exchange-rate.service';

// Mock the service
jest.mock('../../../src/services/exchange-rate.service');

const MockExchangeRateService = ExchangeRateService as jest.MockedClass<typeof ExchangeRateService>;

// Create a mock Fastify instance
function createMockFastify() {
  const routes: Record<string, { handler: Function; preHandler?: Function[] }> = {};

  const fastify: any = {
    prisma: {},
    redis: null,
    authenticate: jest.fn(),
    requireAdmin: jest.fn(),
    get: jest.fn((path: string, ...args: any[]) => {
      if (args.length === 1) {
        routes[`GET:${path}`] = { handler: args[0] };
      } else {
        routes[`GET:${path}`] = { handler: args[1], preHandler: args[0]?.preHandler };
      }
    }),
    post: jest.fn((path: string, ...args: any[]) => {
      if (args.length === 1) {
        routes[`POST:${path}`] = { handler: args[0] };
      } else {
        routes[`POST:${path}`] = { handler: args[1], preHandler: args[0]?.preHandler };
      }
    }),
    routes,
  };

  return fastify;
}

function createMockReply() {
  const reply: any = {
    _statusCode: 200,
    _body: null,
    code: jest.fn(function (this: any, code: number) {
      this._statusCode = code;
      return this;
    }),
    send: jest.fn(function (this: any, body: any) {
      this._body = body;
      return this;
    }),
  };
  return reply;
}

describe('Exchange Rates Routes', () => {
  let mockFastify: any;
  let mockServiceInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockServiceInstance = {
      listRates: jest.fn(),
      getSupportedCurrencies: jest.fn(),
      convert: jest.fn(),
      setRate: jest.fn(),
      getRate: jest.fn(),
    };

    MockExchangeRateService.mockImplementation(() => mockServiceInstance);

    mockFastify = createMockFastify();

    // Register routes
    const routeModule = await import('../../../src/routes/v1/exchange-rates.js');
    await routeModule.default(mockFastify);
  });

  describe('GET /v1/exchange-rates', () => {
    it('should return supported currencies and current rates', async () => {
      const { Decimal } = await import('@prisma/client/runtime/library');
      mockServiceInstance.getSupportedCurrencies.mockReturnValue(['USD', 'EUR', 'GBP']);
      mockServiceInstance.listRates.mockResolvedValue([
        {
          id: 'er_1',
          currency: 'EUR',
          rateToUsd: new Decimal('0.92'),
          source: 'ecb',
          fetchedAt: new Date('2025-01-01T12:00:00Z'),
          createdAt: new Date('2025-01-01T12:00:00Z'),
        },
        {
          id: 'er_2',
          currency: 'GBP',
          rateToUsd: new Decimal('0.79'),
          source: 'ecb',
          fetchedAt: new Date('2025-01-01T12:00:00Z'),
          createdAt: new Date('2025-01-01T12:00:00Z'),
        },
      ]);

      const reply = createMockReply();
      const handler = mockFastify.routes['GET:/'].handler;
      await handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith({
        supported_currencies: ['USD', 'EUR', 'GBP'],
        rates: [
          {
            currency: 'EUR',
            rate_to_usd: 0.92,
            source: 'ecb',
            fetched_at: '2025-01-01T12:00:00.000Z',
          },
          {
            currency: 'GBP',
            rate_to_usd: 0.79,
            source: 'ecb',
            fetched_at: '2025-01-01T12:00:00.000Z',
          },
        ],
      });
    });
  });

  describe('GET /v1/exchange-rates/convert', () => {
    it('should convert amount between currencies', async () => {
      mockServiceInstance.convert.mockResolvedValue({
        convertedAmount: 108.70,
        rate: 0.92,
        sourceCurrency: 'EUR',
        targetCurrency: 'USD',
      });

      const reply = createMockReply();
      const handler = mockFastify.routes['GET:/convert'].handler;
      await handler({ query: { amount: '100', from: 'EUR', to: 'USD' } }, reply);

      expect(reply.send).toHaveBeenCalledWith({
        amount: 100,
        from: 'EUR',
        to: 'USD',
        converted_amount: 108.70,
        rate: 0.92,
      });
    });

    it('should default target currency to USD', async () => {
      mockServiceInstance.convert.mockResolvedValue({
        convertedAmount: 126.58,
        rate: 0.79,
        sourceCurrency: 'GBP',
        targetCurrency: 'USD',
      });

      const reply = createMockReply();
      const handler = mockFastify.routes['GET:/convert'].handler;
      await handler({ query: { amount: '100', from: 'GBP' } }, reply);

      expect(mockServiceInstance.convert).toHaveBeenCalledWith(100, 'GBP', 'USD');
    });

    it('should return 400 for invalid amount', async () => {
      const reply = createMockReply();
      const handler = mockFastify.routes['GET:/convert'].handler;
      await handler({ query: { amount: 'abc', from: 'EUR' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply._body.detail).toContain('positive number');
    });
  });

  describe('POST /v1/exchange-rates', () => {
    it('should require admin authentication', () => {
      const route = mockFastify.routes['POST:/'];
      expect(route.preHandler).toContain(mockFastify.authenticate);
      expect(route.preHandler).toContain(mockFastify.requireAdmin);
    });

    it('should create a new exchange rate', async () => {
      const { Decimal } = await import('@prisma/client/runtime/library');
      const now = new Date();
      mockServiceInstance.setRate.mockResolvedValue({
        id: 'er_new',
        currency: 'EUR',
        rateToUsd: new Decimal('0.93'),
        source: 'manual',
        fetchedAt: now,
        createdAt: now,
      });

      const reply = createMockReply();
      const handler = mockFastify.routes['POST:/'].handler;
      await handler(
        { body: { currency: 'eur', rate_to_usd: 0.93 } },
        reply
      );

      expect(mockServiceInstance.setRate).toHaveBeenCalledWith('EUR', 0.93, 'manual');
      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply._body.currency).toBe('EUR');
      expect(reply._body.rate_to_usd).toBe(0.93);
    });
  });
});
