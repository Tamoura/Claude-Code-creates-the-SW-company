import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { logger } from '../../utils/logger.js';

/**
 * Public checkout routes - no authentication required.
 * These endpoints return minimal payment info for the customer-facing checkout UI.
 */
const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limit config for public endpoints (RISK-032 fix)
  const publicRateLimit = {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (request: FastifyRequest) => `checkout:${request.ip}`,
      },
    },
  };

  // GET /v1/checkout/:id - Public endpoint for checkout page
  fastify.get('/:id', publicRateLimit, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.paymentSession.findUnique({
      where: { id },
    });

    if (!session) {
      return reply.code(404).send({
        type: 'https://gateway.io/errors/payment-not-found',
        title: 'Payment Not Found',
        status: 404,
        detail: 'Payment session not found',
      });
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      return reply.code(410).send({
        type: 'https://gateway.io/errors/payment-expired',
        title: 'Payment Expired',
        status: 410,
        detail: 'This payment session has expired',
      });
    }

    // Return only the fields needed for the checkout UI
    // No sensitive merchant data, no internal IDs beyond the session ID
    return reply.send({
      id: session.id,
      amount: Number(session.amount),
      currency: session.currency,
      description: session.description,
      status: session.status,
      network: session.network,
      token: session.token,
      merchant_address: session.merchantAddress,
      customer_address: session.customerAddress,
      tx_hash: session.txHash,
      confirmations: session.confirmations,
      checkout_url: `${process.env.FRONTEND_URL || 'http://localhost:3104'}/pay/${session.id}`,
      created_at: session.createdAt.toISOString(),
      expires_at: session.expiresAt.toISOString(),
    });
  });
};

export default checkoutRoutes;
