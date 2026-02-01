import { FastifyInstance } from 'fastify';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from './handlers';

export async function clientRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/clients', listClients);
  fastify.get('/api/clients/:id', getClient);
  fastify.post('/api/clients', createClient);
  fastify.patch('/api/clients/:id', updateClient);
  fastify.delete('/api/clients/:id', deleteClient);
}
