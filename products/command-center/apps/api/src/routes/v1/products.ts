import type { FastifyInstance } from 'fastify';
import { listProducts, getProduct } from '../../services/products.service.js';

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
}
