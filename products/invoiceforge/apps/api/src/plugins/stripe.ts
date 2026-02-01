import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Stripe from 'stripe';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    stripe: Stripe;
  }
}

async function stripePlugin(fastify: FastifyInstance): Promise<void> {
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  });

  fastify.decorate('stripe', stripe);
}

export default fp(stripePlugin, {
  name: 'stripe',
});
