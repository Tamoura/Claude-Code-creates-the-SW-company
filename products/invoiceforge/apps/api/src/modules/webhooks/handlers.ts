import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config';
import { BadRequestError } from '../../lib/errors';

export async function handleStripeWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signature = request.headers['stripe-signature'];
  if (!signature) {
    throw new BadRequestError(
      'Missing stripe-signature header'
    );
  }

  // In test env with fake key, skip real verification
  const isTest = config.nodeEnv === 'test';
  let event: any;

  if (!isTest && config.stripeWebhookSecret && request.server.stripe) {
    try {
      const rawBody =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      event = request.server.stripe.webhooks.constructEvent(
        rawBody,
        signature as string,
        config.stripeWebhookSecret
      );
    } catch (err) {
      throw new BadRequestError(
        'Invalid webhook signature'
      );
    }
  } else {
    // Test mode: use the body directly
    event = request.body as any;
  }

  // Handle checkout.session.completed
  if (event && event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const invoiceId = session?.metadata?.invoiceId;

    if (invoiceId) {
      // Idempotent: only update if not already paid
      const invoice = await request.server.db.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (invoice && invoice.status !== 'paid') {
        await request.server.db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'paid',
            paidAt: new Date(),
          },
        });
      }
    }
  }

  reply.send({ received: true });
}
