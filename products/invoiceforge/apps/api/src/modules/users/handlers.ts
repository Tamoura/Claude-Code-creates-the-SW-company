import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as userService from './service';
import { updateProfileSchema } from './schemas';
import { BadRequestError } from '../../lib/errors';
import { config } from '../../config';

const stripeCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

export async function getProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const profile = await userService.getProfile(
    request.server.db,
    request.userId
  );
  reply.send(profile);
}

export async function updateProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = updateProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(
      `Validation failed: ${messages.join(', ')}`
    );
  }

  const profile = await userService.updateProfile(
    request.server.db,
    request.userId,
    parsed.data
  );
  reply.send(profile);
}

export async function getSubscription(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const subscription = await userService.getSubscription(
    request.server.db,
    request.userId
  );
  reply.send(subscription);
}

export async function getStripeConnectUrl(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const clientId = config.stripeSecretKey
    ? 'ca_stripe_connect_placeholder'
    : '';

  const redirectUri = `${config.appUrl}/api/users/me/stripe/callback`;
  const url =
    `https://connect.stripe.com/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&scope=read_write` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${request.userId}`;

  reply.send({ url });
}

export async function handleStripeCallback(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = stripeCallbackSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(
      `Validation failed: ${messages.join(', ')}`
    );
  }

  // In production, exchange the code for a Stripe account ID
  // via stripe.oauth.token({ grant_type: 'authorization_code', code })
  // For now, store a placeholder for testing
  const isTest = config.nodeEnv === 'test';
  let stripeAccountId: string;

  if (!isTest && request.server.stripe) {
    const response = await request.server.stripe.oauth.token({
      grant_type: 'authorization_code',
      code: parsed.data.code,
    });
    stripeAccountId = response.stripe_user_id!;
  } else {
    stripeAccountId = `acct_test_${parsed.data.code}`;
  }

  await request.server.db.user.update({
    where: { id: request.userId },
    data: { stripeAccountId },
  });

  reply.send({
    connected: true,
    stripeAccountId,
  });
}
