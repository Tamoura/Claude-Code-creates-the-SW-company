/**
 * Exchange Rates API Routes
 *
 * Public and authenticated endpoints for retrieving and managing
 * currency exchange rates (EUR/GBP → USD).
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { ExchangeRateService } from '../../services/exchange-rate.service.js';

export default async function exchangeRateRoutes(fastify: FastifyInstance) {
  const service = new ExchangeRateService(fastify.prisma, fastify.redis);

  /**
   * GET /v1/exchange-rates
   * List current exchange rates for all supported currencies.
   * Public endpoint — no authentication required.
   */
  fastify.get('/', async (request, reply) => {
    const rates = await service.listRates();
    const supported = service.getSupportedCurrencies();

    return reply.send({
      supported_currencies: supported,
      rates: rates.map((r) => ({
        currency: r.currency,
        rate_to_usd: parseFloat(r.rateToUsd.toString()),
        source: r.source,
        fetched_at: r.fetchedAt.toISOString(),
      })),
    });
  });

  /**
   * GET /v1/exchange-rates/convert
   * Convert an amount between currencies.
   * Public endpoint.
   */
  fastify.get(
    '/convert',
    async (
      request: FastifyRequest<{
        Querystring: { amount: string; from: string; to?: string };
      }>,
      reply
    ) => {
      const { amount, from, to = 'USD' } = request.query;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Amount must be a positive number',
        });
      }

      const result = await service.convert(numAmount, from.toUpperCase(), to.toUpperCase());

      return reply.send({
        amount: numAmount,
        from: result.sourceCurrency,
        to: result.targetCurrency,
        converted_amount: result.convertedAmount,
        rate: result.rate,
      });
    }
  );

  /**
   * POST /v1/exchange-rates
   * Set a new exchange rate (admin only).
   */
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (
      request: FastifyRequest<{
        Body: { currency: string; rate_to_usd: number; source?: string };
      }>,
      reply
    ) => {
      const { currency, rate_to_usd, source } = request.body;

      const rate = await service.setRate(
        currency.toUpperCase(),
        rate_to_usd,
        source || 'manual'
      );

      return reply.code(201).send({
        id: rate.id,
        currency: rate.currency,
        rate_to_usd: parseFloat(rate.rateToUsd.toString()),
        source: rate.source,
        fetched_at: rate.fetchedAt.toISOString(),
      });
    }
  );
}
