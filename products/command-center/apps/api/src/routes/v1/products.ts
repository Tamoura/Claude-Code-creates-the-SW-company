import type { FastifyInstance } from 'fastify';
import { listProducts, getProduct, productExists, listProductDocs, getProductDoc, getPitchDeck } from '../../services/products.service.js';
import { generatePdfFromMarkdown } from '../../services/pdf.service.js';

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

  // GET /products/:name/pitch-deck - get pitch deck JSON
  fastify.get<{ Params: { name: string } }>('/products/:name/pitch-deck', async (request, reply) => {
    const { name } = request.params;
    if (!productExists(name)) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    const deck = getPitchDeck(name);
    if (!deck) {
      return reply.status(404).send({ error: 'Pitch deck not found' });
    }

    return deck;
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

  // GET /products/:name/docs-pdf/* - generate PDF from a doc
  fastify.get<{ Params: { name: string; '*': string } }>('/products/:name/docs-pdf/*', async (request, reply) => {
    const { name } = request.params;
    const filename = request.params['*'];

    if (!filename) {
      return reply.status(400).send({ error: 'Filename is required' });
    }

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

    try {
      const pdfBuffer = await generatePdfFromMarkdown(doc.content, doc.title, name);
      const sanitizedTitle = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, '_');

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${name}-${sanitizedTitle}.pdf"`)
        .send(pdfBuffer);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : '';
      fastify.log.error({ err: errMsg, stack: errStack }, 'PDF generation failed');
      return reply.status(500).send({ error: 'PDF generation failed', detail: errMsg });
    }
  });
}
