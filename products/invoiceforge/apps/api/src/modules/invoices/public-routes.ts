import { FastifyInstance } from 'fastify';
import { getPublicInvoice } from './handlers';

export async function publicInvoiceRoutes(
  fastify: FastifyInstance
): Promise<void> {
  // No auth hook -- these are public routes
  fastify.get('/api/invoices/public/:token', getPublicInvoice);
}
