/**
 * Hands the raw client to the tenancy layer, once, at boot.   ADR-004 §2
 *
 * `withTenant(ctx, fn)` takes no client argument — ADR-004 §2 fixes that
 * signature, and threading a client through every repository call would put a
 * raw `PrismaClient` in scope at every call site, which is the thing the brand
 * exists to prevent. So the client is registered here instead.
 *
 * Must be registered AFTER the prisma plugin: it reads `fastify.prisma`.
 */
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { registerTenancyClient } from '../tenancy';

const tenancyPlugin: FastifyPluginAsync = async (fastify) => {
  registerTenancyClient(fastify.prisma);
  fastify.log.debug('Tenancy layer bound to the Prisma client');
};

export default fp(tenancyPlugin, {
  name: 'tenancy-plugin',
  dependencies: ['prisma-plugin'],
});
