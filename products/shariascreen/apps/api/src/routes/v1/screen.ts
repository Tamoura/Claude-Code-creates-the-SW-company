import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ScreeningService } from '../../services/screening.service';
import {
  findStockByTicker,
  findStocksByTickers,
} from '../../data/stocks';
import { NotFoundError, BadRequestError } from '../../lib/errors';

const screeningService = new ScreeningService();

const batchSchema = z.object({
  tickers: z
    .array(z.string().min(1).max(20))
    .min(1, 'At least one ticker required')
    .max(50, 'Maximum 50 tickers per batch'),
});

const screenRoutes: FastifyPluginAsync = async (fastify) => {
  // Screen single stock
  fastify.get<{ Params: { ticker: string } }>(
    '/screen/:ticker',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission('read'),
      ],
    },
    async (request, reply) => {
      const { ticker } = request.params;
      const stock = findStockByTicker(ticker);

      if (!stock) {
        throw new NotFoundError(
          `Stock with ticker '${ticker.toUpperCase()}' not found`
        );
      }

      const result = screeningService.screenStock(stock);
      return reply.send(result);
    }
  );

  // Batch screen multiple stocks
  fastify.post<{ Body: { tickers: string[] } }>(
    '/screen/batch',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission('read'),
      ],
    },
    async (request, reply) => {
      const parsed = batchSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.errors[0].message
        );
      }

      const { tickers } = parsed.data;
      const { found, notFound } =
        findStocksByTickers(tickers);

      const result = screeningService.screenBatch(found);

      if (notFound.length > 0) {
        return reply.send({
          ...result,
          warnings: {
            notFound,
            message: `${notFound.length} ticker(s) not found`,
          },
        });
      }

      return reply.send(result);
    }
  );

  // Detailed compliance report
  fastify.get<{ Params: { ticker: string } }>(
    '/report/:ticker',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission('read'),
      ],
    },
    async (request, reply) => {
      const { ticker } = request.params;
      const stock = findStockByTicker(ticker);

      if (!stock) {
        throw new NotFoundError(
          `Stock with ticker '${ticker.toUpperCase()}' not found`
        );
      }

      const report = screeningService.generateReport(stock);
      return reply.send(report);
    }
  );
};

export default screenRoutes;
