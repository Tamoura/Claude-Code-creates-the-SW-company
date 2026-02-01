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

  const isTest = config.nodeEnv === 'test';
  let event: Record<string, unknown>;

  // Determine the webhook secret: use test secret in test mode,
  // production secret otherwise. Always verify signatures.
  const webhookSecret = isTest
    ? config.stripeTestWebhookSecret
    : config.stripeWebhookSecret;

  if (!webhookSecret || !request.server.stripe) {
    throw new BadRequestError(
      'Stripe webhook not configured'
    );
  }

  try {
    const rawBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);
    event = request.server.stripe.webhooks.constructEvent(
      rawBody,
      signature as string,
      webhookSecret
    ) as unknown as Record<string, unknown>;
  } catch {
    throw new BadRequestError(
      'Invalid webhook signature'
    );
  }

  // Handle checkout.session.completed
  if (event && event.type === 'checkout.session.completed') {
    const data = event.data as Record<string, unknown> | undefined;
    const session = data?.object as Record<string, unknown> | undefined;
    const metadata = session?.metadata as Record<string, string> | undefined;
    const invoiceId = metadata?.invoiceId;

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
