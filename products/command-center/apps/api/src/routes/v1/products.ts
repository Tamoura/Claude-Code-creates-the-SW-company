import type { FastifyInstance } from 'fastify';
import { listProducts, getProduct, productExists, listProductDocs, getProductDoc } from '../../services/products.service.js';

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/products', async () => {
    return { products: listProducts() };
  });

  fastify.get<{ Params: { name: string } }>('/products/:name', async (request, reply) => {
    const product = getProduct(request.params.name);
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }
    return { product };
  });

  // GET /products/:name/docs - list all docs for a product
  fastify.get<{ Params: { name: string } }>('/products/:name/docs', async (request, reply) => {
    const { name } = request.params;
    if (!productExists(name)) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    const docs = listProductDocs(name);
    return { product: name, docs };
  });

  // GET /products/:name/docs/* - get raw markdown content of a specific doc
  // The wildcard captures subdirectory paths like "ADRs/001-tech-stack.md"
  fastify.get<{ Params: { name: string; '*': string } }>('/products/:name/docs/*', async (request, reply) => {
    const { name } = request.params;
    const filename = request.params['*'];

    if (!filename) {
      return reply.status(400).send({ error: 'Filename is required' });
    }

    // Security: reject path traversal
    if (filename.includes('..') || filename.startsWith('/')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }

    if (!productExists(name)) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    const doc = getProductDoc(name, filename);
    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    return doc;
  });
}
