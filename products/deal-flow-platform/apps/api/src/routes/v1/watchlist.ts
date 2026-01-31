import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index';
import { verifyToken, requireRole } from '../../middleware/auth';
import { validate } from '../../lib/validate';

const addWatchlistSchema = z.object({
  dealId: z.string().min(1),
});

export default async function watchlistRoutes(fastify: FastifyInstance) {

  // GET / -- list watchlisted deals
  fastify.get('/', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser!;
    const query = request.query as Record<string, string>;
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const cursor = query.cursor;

    const total = await fastify.prisma.watchlistItem.count({
      where: { userId: user.id },
    });

    const cursorClause = cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {};

    const items = await fastify.prisma.watchlistItem.findMany({
      where: { userId: user.id },
      take: limit,
      ...cursorClause,
      orderBy: { createdAt: 'desc' },
      include: {
        deal: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            dealType: true,
            status: true,
            shariaCompliance: true,
            minInvestment: true,
            currency: true,
          },
        },
      },
    });

    const nextCursor = items.length === limit
      ? items[items.length - 1].id
      : null;

    return reply.send({
      data: items,
      meta: { total, limit, nextCursor },
    });
  });

  // POST / -- add deal to watchlist
  fastify.post('/', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(addWatchlistSchema, request.body);
    const user = request.currentUser!;

    // Verify deal exists
    const deal = await fastify.prisma.deal.findUnique({
      where: { id: body.dealId },
    });

    if (!deal) {
      throw new AppError(404, 'DEAL_NOT_FOUND', 'Deal not found');
    }

    // Check for duplicate
    const existing = await fastify.prisma.watchlistItem.findUnique({
      where: { userId_dealId: { userId: user.id, dealId: body.dealId } },
    });

    if (existing) {
      throw new AppError(409, 'ALREADY_WATCHLISTED', 'Deal already in watchlist');
    }

    const item = await fastify.prisma.watchlistItem.create({
      data: { userId: user.id, dealId: body.dealId },
      include: { deal: { select: { titleEn: true, dealType: true } } },
    });

    return reply.code(201).send({ data: item });
  });

  // DELETE /:dealId -- remove from watchlist
  fastify.delete('/:dealId', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { dealId } = request.params as { dealId: string };
    const user = request.currentUser!;

    const item = await fastify.prisma.watchlistItem.findUnique({
      where: { userId_dealId: { userId: user.id, dealId } },
    });

    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Deal not in watchlist');
    }

    await fastify.prisma.watchlistItem.delete({
      where: { id: item.id },
    });

    return reply.send({ data: { message: 'Removed from watchlist' } });
  });
}
