import type { FastifyInstance } from 'fastify';
import { getSettings, getAgentDefinitions } from '../../services/settings.service.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/settings', async () => {
    return getSettings();
  });

  fastify.get('/settings/agents', async () => {
    return { agents: getAgentDefinitions() };
  });
}
