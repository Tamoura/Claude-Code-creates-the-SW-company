import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { getConfig } from '../config';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  await fastify.register(cors, {
    origin: [config.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  });
};

export default fp(corsPlugin, { name: 'cors' });
