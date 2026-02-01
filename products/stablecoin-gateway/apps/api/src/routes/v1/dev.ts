import { FastifyPluginAsync } from 'fastify';
import { logger } from '../../utils/logger.js';

/**
 * Development-only routes for simulating payment flows.
 * Bypasses blockchain verification. NEVER registered in production.
 */
const devRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/dev/simulate/:id — advance a payment to COMPLETED
  fastify.post('/simulate/:id', async (request, reply) => {
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

    if (session.status === 'COMPLETED') {
      return reply.send({
        id: session.id,
        status: session.status,
        message: 'Payment already completed',
      });
    }

    if (session.status === 'FAILED' || session.status === 'REFUNDED') {
      return reply.code(400).send({
        type: 'https://gateway.io/errors/invalid-state',
        title: 'Invalid State',
        status: 400,
        detail: `Cannot simulate payment in ${session.status} state`,
      });
    }

    const fakeTxHash = '0xsim' + Array.from({ length: 60 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const fakeCustomer = '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Advance PENDING → CONFIRMING first
    if (session.status === 'PENDING') {
      await fastify.prisma.paymentSession.update({
        where: { id },
        data: {
          status: 'CONFIRMING',
          txHash: fakeTxHash,
          customerAddress: fakeCustomer,
          blockNumber: 12345678,
          confirmations: 1,
        },
      });
    }

    // Advance to COMPLETED
    const updated = await fastify.prisma.paymentSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        txHash: session.txHash || fakeTxHash,
        customerAddress: session.customerAddress || fakeCustomer,
        blockNumber: session.blockNumber || 12345678,
        confirmations: 12,
        completedAt: new Date(),
      },
    });

    logger.info('Payment simulated to COMPLETED (dev mode)', {
      paymentSessionId: id,
      txHash: updated.txHash,
    });

    return reply.send({
      id: updated.id,
      amount: Number(updated.amount),
      currency: updated.currency,
      status: updated.status,
      network: updated.network,
      token: updated.token,
      merchant_address: updated.merchantAddress,
      customer_address: updated.customerAddress,
      tx_hash: updated.txHash,
      confirmations: updated.confirmations,
      completed_at: updated.completedAt?.toISOString(),
    });
  });
};

export default devRoutes;
