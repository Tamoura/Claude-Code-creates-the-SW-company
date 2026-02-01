import { FastifyInstance } from 'fastify';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from './handlers';

export async function invoiceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/invoices', listInvoices);
  fastify.get('/api/invoices/:id', getInvoice);
  fastify.post('/api/invoices', createInvoice);
  fastify.put('/api/invoices/:id', updateInvoice);
  fastify.delete('/api/invoices/:id', deleteInvoice);
}
