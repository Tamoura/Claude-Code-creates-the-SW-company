import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import csrf from '@fastify/csrf-protection';

const csrfPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(csrf, {
    sessionPlugin: '@fastify/cookie',
    cookieOpts: {
      signed: true,
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  });
};

export default fp(csrfPlugin, {
  name: 'csrf',
  dependencies: ['auth'],
});
