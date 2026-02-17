import type { FastifyInstance } from 'fastify';
import { getAlerts } from '../../services/alerts.service.js';

export async function alertsRoutes(fastify: FastifyInstance) {
  fastify.get('/alerts', async () => {
    return { alerts: getAlerts() };
  });
}
