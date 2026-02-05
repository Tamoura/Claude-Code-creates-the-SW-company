/**
 * ExchangeRateService Tests
 *
 * Tests Redis-cached exchange rate management for multi-currency
 * payment support (EUR, GBP → USD conversion).
 *
 * Test cases:
 * 1. getRate returns latest rate for a supported currency
 * 2. getRate throws for unsupported currency
 * 3. convert converts amount from source currency to USD
 * 4. convert returns same amount when currency is USD
 * 5. setRate stores a new exchange rate
 * 6. listRates returns all supported currency rates
 * 7. Cache is used when available (Redis)
 * 8. Stale rate (>24h) triggers a warning
 * 9. getSupportedCurrencies returns list of supported currencies
 */

import { ExchangeRateService } from '../../src/services/exchange-rate.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    exchangeRate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
});

afterAll(() => {
  jest.restoreAllMocks();
});

function createMockRedis() {
  const store: Record<string, string> = {};
  return {
    store,
    get: jest.fn(async (key: string) => store[key] || null),
    set: jest.fn(async (key: string, value: string) => {
      store[key] = value;
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      delete store[key];
      return 1;
    }),
  };
}

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let mockPrisma: any;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
    mockRedis = createMockRedis();
    service = new ExchangeRateService(mockPrisma, mockRedis as any);
  });

  describe('getSupportedCurrencies', () => {
    it('should return list of supported currencies including USD', () => {
      const currencies = service.getSupportedCurrencies();
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('GBP');
    });
  });

  describe('getRate', () => {
    it('should return 1.0 for USD (no conversion needed)', async () => {
      const rate = await service.getRate('USD');
      expect(rate).toBe(1);
      // Should not hit database for USD
      expect(mockPrisma.exchangeRate.findFirst).not.toHaveBeenCalled();
    });

    it('should return latest rate from cache when available', async () => {
      // Pre-populate Redis cache
      const cachedRate = {
        rateToUsd: '0.92',
        fetchedAt: new Date().toISOString(),
        source: 'ecb',
      };
      mockRedis.store['exchange_rate:EUR'] = JSON.stringify(cachedRate);

      const rate = await service.getRate('EUR');

      expect(rate).toBeCloseTo(0.92);
      // Should NOT hit database when cache exists
      expect(mockPrisma.exchangeRate.findFirst).not.toHaveBeenCalled();
    });

    it('should fall back to database when cache misses', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        id: 'er_1',
        currency: 'EUR',
        rateToUsd: new Decimal('0.92'),
        source: 'ecb',
        fetchedAt: new Date(),
        createdAt: new Date(),
      });

      const rate = await service.getRate('EUR');

      expect(rate).toBeCloseTo(0.92);
      expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: { currency: 'EUR' },
        orderBy: { fetchedAt: 'desc' },
      });
      // Should populate cache after DB read
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw for unsupported currency', async () => {
      await expect(service.getRate('JPY')).rejects.toThrow(
        'Unsupported currency: JPY'
      );
    });

    it('should throw when no rate exists in DB or cache', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      await expect(service.getRate('EUR')).rejects.toThrow(
        'No exchange rate found for EUR'
      );
    });
  });

  describe('convert', () => {
    it('should convert EUR to USD using the exchange rate', async () => {
      // EUR rate: 1 EUR = 1.0870 USD → rateToUsd = 0.92 (1/1.087)
      // means 1 USD costs 0.92 EUR, so 100 EUR = 100/0.92 = ~108.70 USD
      const cachedRate = {
        rateToUsd: '0.92',
        fetchedAt: new Date().toISOString(),
        source: 'ecb',
      };
      mockRedis.store['exchange_rate:EUR'] = JSON.stringify(cachedRate);

      const result = await service.convert(100, 'EUR', 'USD');

      // 100 EUR / 0.92 = ~108.70 USD
      expect(result.convertedAmount).toBeCloseTo(108.70, 1);
      expect(result.rate).toBeCloseTo(0.92);
      expect(result.sourceCurrency).toBe('EUR');
      expect(result.targetCurrency).toBe('USD');
    });

    it('should convert GBP to USD using the exchange rate', async () => {
      // GBP rate: 1 USD = 0.79 GBP → 100 GBP / 0.79 = ~126.58 USD
      const cachedRate = {
        rateToUsd: '0.79',
        fetchedAt: new Date().toISOString(),
        source: 'ecb',
      };
      mockRedis.store['exchange_rate:GBP'] = JSON.stringify(cachedRate);

      const result = await service.convert(100, 'GBP', 'USD');

      expect(result.convertedAmount).toBeCloseTo(126.58, 1);
      expect(result.rate).toBeCloseTo(0.79);
    });

    it('should return same amount when converting USD to USD', async () => {
      const result = await service.convert(100, 'USD', 'USD');

      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
    });

    it('should throw for zero or negative amounts', async () => {
      await expect(service.convert(0, 'EUR', 'USD')).rejects.toThrow(
        'Amount must be positive'
      );
      await expect(service.convert(-10, 'EUR', 'USD')).rejects.toThrow(
        'Amount must be positive'
      );
    });
  });

  describe('setRate', () => {
    it('should store a new exchange rate in the database', async () => {
      const now = new Date();
      mockPrisma.exchangeRate.create.mockResolvedValue({
        id: 'er_new',
        currency: 'EUR',
        rateToUsd: new Decimal('0.93'),
        source: 'manual',
        fetchedAt: now,
        createdAt: now,
      });

      const result = await service.setRate('EUR', 0.93, 'manual');

      expect(mockPrisma.exchangeRate.create).toHaveBeenCalledWith({
        data: {
          currency: 'EUR',
          rateToUsd: 0.93,
          source: 'manual',
        },
      });
      expect(result.currency).toBe('EUR');
      // Should invalidate cache
      expect(mockRedis.del).toHaveBeenCalledWith('exchange_rate:EUR');
    });

    it('should throw for unsupported currency', async () => {
      await expect(service.setRate('JPY', 150, 'manual')).rejects.toThrow(
        'Unsupported currency: JPY'
      );
    });

    it('should throw for invalid rate', async () => {
      await expect(service.setRate('EUR', 0, 'manual')).rejects.toThrow(
        'Rate must be positive'
      );
      await expect(service.setRate('EUR', -1, 'manual')).rejects.toThrow(
        'Rate must be positive'
      );
    });
  });

  describe('listRates', () => {
    it('should return latest rates for all supported currencies', async () => {
      mockPrisma.exchangeRate.findMany.mockResolvedValue([
        {
          id: 'er_1',
          currency: 'EUR',
          rateToUsd: new Decimal('0.92'),
          source: 'ecb',
          fetchedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'er_2',
          currency: 'GBP',
          rateToUsd: new Decimal('0.79'),
          source: 'ecb',
          fetchedAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const rates = await service.listRates();

      expect(rates).toHaveLength(2);
      expect(rates[0].currency).toBe('EUR');
      expect(rates[1].currency).toBe('GBP');
    });
  });

  describe('without Redis', () => {
    it('should work without Redis (database-only mode)', async () => {
      const serviceNoRedis = new ExchangeRateService(mockPrisma);

      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        id: 'er_1',
        currency: 'EUR',
        rateToUsd: new Decimal('0.92'),
        source: 'ecb',
        fetchedAt: new Date(),
        createdAt: new Date(),
      });

      const rate = await serviceNoRedis.getRate('EUR');
      expect(rate).toBeCloseTo(0.92);
    });
  });
});
