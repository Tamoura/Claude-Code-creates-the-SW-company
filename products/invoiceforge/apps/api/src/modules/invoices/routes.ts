import { FastifyInstance } from 'fastify';
import {
  generateInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
} from './handlers';

export async function invoiceRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/api/invoices/generate', generateInvoice);
  fastify.get('/api/invoices', listInvoices);
  fastify.get('/api/invoices/:id', getInvoice);
  fastify.put('/api/invoices/:id', updateInvoice);
  fastify.delete('/api/invoices/:id', deleteInvoice);
  fastify.post('/api/invoices/:id/send', sendInvoice);
}
