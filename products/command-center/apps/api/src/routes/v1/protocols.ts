import type { FastifyInstance } from 'fastify';
import { getProtocols } from '../../services/protocols.service.js';

export async function protocolRoutes(fastify: FastifyInstance) {
  fastify.get('/protocols', async () => {
    return { protocols: getProtocols() };
  });
}
