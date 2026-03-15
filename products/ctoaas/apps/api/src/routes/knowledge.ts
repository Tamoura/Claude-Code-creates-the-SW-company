/**
 * Knowledge Document Routes
 *
 * Implements FR-005 (Knowledge Base / RAG Pipeline)
 * Traces to: US-03, US-04, IMPL-026
 *
 * Routes:
 *   POST   /api/v1/knowledge/documents          — Upload document
 *   GET    /api/v1/knowledge/documents          — List (paginated)
 *   GET    /api/v1/knowledge/documents/:id      — Detail + chunk count
 *   GET    /api/v1/knowledge/documents/:id/status — Ingestion status
 */

import { FastifyPluginAsync } from 'fastify';
import { KnowledgeService } from '../services/knowledge.service';
import { sendSuccess } from '../lib/response';

const knowledgeRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new KnowledgeService(fastify.prisma);

  // POST /api/v1/knowledge/documents
  fastify.post(
    '/api/v1/knowledge/documents',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = request.body as {
        title?: string;
        category?: string;
        content?: string;
        mimeType?: string;
        author?: string;
      };

      const result = await service.uploadDocument({
        title: body.title ?? '',
        category: body.category ?? '',
        content: body.content ?? '',
        mimeType: body.mimeType ?? 'text/plain',
        author: body.author,
      });

      return sendSuccess(reply, result, 201);
    }
  );

  // GET /api/v1/knowledge/documents
  fastify.get(
    '/api/v1/knowledge/documents',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
      };

      const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
      const limit = Math.max(
        1,
        Math.min(100, parseInt(query.limit ?? '10', 10) || 10)
      );

      const result = await service.listDocuments({ page, limit });
      return sendSuccess(reply, result);
    }
  );

  // GET /api/v1/knowledge/documents/:id
  fastify.get(
    '/api/v1/knowledge/documents/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await service.getDocument(id);
      return sendSuccess(reply, result);
    }
  );

  // GET /api/v1/knowledge/documents/:id/status
  fastify.get(
    '/api/v1/knowledge/documents/:id/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await service.getDocumentStatus(id);
      return sendSuccess(reply, result);
    }
  );
};

export default knowledgeRoutes;
