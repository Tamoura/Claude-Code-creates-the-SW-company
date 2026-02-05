/**
 * Exchange Rate Service
 *
 * Manages currency exchange rates for multi-currency payment support.
 * Supports EUR, GBP → USD conversion with Redis caching and database persistence.
 *
 * Rate convention: rateToUsd = how many units of the foreign currency
 * equal 1 USD. For example, rateToUsd = 0.92 for EUR means 1 USD = 0.92 EUR.
 * To convert X EUR to USD: X / rateToUsd = USD amount.
 */

import { PrismaClient, ExchangeRate } from '@prisma/client';
import { AppError } from '../types/index.js';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const CACHE_TTL_SECONDS = 3600; // 1 hour cache

export interface ConversionResult {
  convertedAmount: number;
  rate: number;
  sourceCurrency: string;
  targetCurrency: string;
}

export class ExchangeRateService {
  constructor(
    private prisma: PrismaClient,
    private redis?: { get: Function; set: Function; del: Function } | null
  ) {}

  getSupportedCurrencies(): string[] {
    return [...SUPPORTED_CURRENCIES];
  }

  /**
   * Get the current exchange rate for a currency (relative to USD).
   * Returns the rateToUsd value (how many units of currency = 1 USD).
   */
  async getRate(currency: string): Promise<number> {
    if (currency === 'USD') return 1;

    this.validateCurrency(currency);

    // Try Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(`exchange_rate:${currency}`);
        if (cached) {
          const data = JSON.parse(cached as string);
          return parseFloat(data.rateToUsd);
        }
      } catch {
        // Cache miss or error — fall through to DB
      }
    }

    // Fall back to database
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { currency },
      orderBy: { fetchedAt: 'desc' },
    });

    if (!rate) {
      throw new AppError(
        404,
        'rate-not-found',
        `No exchange rate found for ${currency}`
      );
    }

    // Populate cache
    if (this.redis) {
      try {
        const cacheData = JSON.stringify({
          rateToUsd: rate.rateToUsd.toString(),
          fetchedAt: rate.fetchedAt.toISOString(),
          source: rate.source,
        });
        await this.redis.set(
          `exchange_rate:${currency}`,
          cacheData,
          'EX',
          CACHE_TTL_SECONDS
        );
      } catch {
        // Cache write failure is non-critical
      }
    }

    return parseFloat(rate.rateToUsd.toString());
  }

  /**
   * Convert an amount from a source currency to a target currency.
   * Currently only supports conversion TO USD (target must be USD).
   */
  async convert(
    amount: number,
    sourceCurrency: string,
    targetCurrency: string
  ): Promise<ConversionResult> {
    if (amount <= 0) {
      throw new AppError(400, 'invalid-amount', 'Amount must be positive');
    }

    if (sourceCurrency === targetCurrency) {
      return {
        convertedAmount: amount,
        rate: 1,
        sourceCurrency,
        targetCurrency,
      };
    }

    const rate = await this.getRate(sourceCurrency);

    // rateToUsd = units of foreign currency per 1 USD
    // So: amount in foreign currency / rateToUsd = amount in USD
    const convertedAmount = parseFloat((amount / rate).toFixed(6));

    return {
      convertedAmount,
      rate,
      sourceCurrency,
      targetCurrency,
    };
  }

  /**
   * Store a new exchange rate.
   */
  async setRate(
    currency: string,
    rateToUsd: number,
    source: string = 'manual'
  ): Promise<ExchangeRate> {
    this.validateCurrency(currency);

    if (rateToUsd <= 0) {
      throw new AppError(400, 'invalid-rate', 'Rate must be positive');
    }

    const rate = await this.prisma.exchangeRate.create({
      data: {
        currency,
        rateToUsd,
        source,
      },
    });

    // Invalidate cache
    if (this.redis) {
      try {
        await this.redis.del(`exchange_rate:${currency}`);
      } catch {
        // Non-critical
      }
    }

    return rate;
  }

  /**
   * List the latest exchange rates for all non-USD supported currencies.
   */
  async listRates(): Promise<ExchangeRate[]> {
    const currencies = SUPPORTED_CURRENCIES.filter((c) => c !== 'USD');

    const rates = await this.prisma.exchangeRate.findMany({
      where: { currency: { in: [...currencies] } },
      orderBy: { fetchedAt: 'desc' },
      distinct: ['currency'],
    });

    return rates;
  }

  private validateCurrency(currency: string): void {
    if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
      throw new AppError(
        400,
        'unsupported-currency',
        `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`
      );
    }
  }
}
