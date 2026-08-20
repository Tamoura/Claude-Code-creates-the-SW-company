import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { getConfig } from '../config';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const { CORS_ORIGIN } = getConfig();
  const origins = CORS_ORIGIN.split(',').map((o) => o.trim());

  await fastify.register(cors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    // X-Request-ID travels both ways for correlation (NFR-013).
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });
};

export default fp(corsPlugin, { name: 'cors-plugin' });
