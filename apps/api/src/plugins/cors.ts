import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env.js';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
};

export default fp(corsPlugin, {
  name: 'cors',
});
