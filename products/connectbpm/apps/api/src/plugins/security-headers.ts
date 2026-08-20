import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';

const securityHeadersPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    // The API serves JSON only; CSP for the browser surface is set by Next.js.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
};

export default fp(securityHeadersPlugin, { name: 'security-headers-plugin' });
