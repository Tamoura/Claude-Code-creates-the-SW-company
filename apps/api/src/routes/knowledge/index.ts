import { FastifyPluginAsync } from 'fastify';
import {
  createKnowledgeArticle,
  getKnowledgeArticle,
  listKnowledgeArticles,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
  publishKnowledgeArticle,
  archiveKnowledgeArticle,
  rateKnowledgeArticle,
} from '../../services/knowledge.service.js';
import {
  createKnowledgeArticleSchema,
  updateKnowledgeArticleSchema,
  listKnowledgeArticlesQuerySchema,
  publishArticleSchema,
  rateArticleSchema,
} from '../../schemas/knowledge.schema.js';
import { parsePaginationParams } from '../../utils/pagination.js';

const knowledgeRoutes: FastifyPluginAsync = async (fastify) => {
  // Create knowledge article
  fastify.post('/knowledge', async (request, reply) => {
    const data = createKnowledgeArticleSchema.parse(request.body);
    const article = await createKnowledgeArticle(fastify.prisma, data);
    return reply.status(201).send(article);
  });

  // List knowledge articles
  fastify.get('/knowledge', async (request) => {
    const query = listKnowledgeArticlesQuerySchema.parse(request.query);
    const { page, limit } = parsePaginationParams(query.page, query.limit);

    const filters = {
      page,
      limit,
      status: query.status,
      categoryId: query.categoryId,
      authorId: query.authorId,
      keyword: query.keyword,
      search: query.search,
    };

    return await listKnowledgeArticles(fastify.prisma, filters);
  });

  // Get knowledge article by ID
  fastify.get('/knowledge/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await getKnowledgeArticle(fastify.prisma, id);

    if (!article) {
      return reply.status(404).send({ error: 'Knowledge article not found' });
    }

    return article;
  });

  // Update knowledge article
  fastify.patch('/knowledge/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateKnowledgeArticleSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const article = await updateKnowledgeArticle(fastify.prisma, id, data, userId);
      return article;
    } catch (error) {
      return reply.status(404).send({ error: 'Knowledge article not found' });
    }
  });

  // Delete knowledge article
  fastify.delete('/knowledge/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access

    try {
      await deleteKnowledgeArticle(fastify.prisma, id, userId);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({ error: 'Knowledge article not found' });
    }
  });

  // Publish knowledge article
  fastify.post('/knowledge/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = publishArticleSchema.parse(request.body);

    try {
      const article = await publishKnowledgeArticle(fastify.prisma, id, data);
      return article;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Archive knowledge article
  fastify.post('/knowledge/:id/archive', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access

    try {
      const article = await archiveKnowledgeArticle(fastify.prisma, id, userId);
      return article;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Rate knowledge article
  fastify.post('/knowledge/:id/rate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = rateArticleSchema.parse(request.body);

    try {
      await rateKnowledgeArticle(fastify.prisma, id, data);
      return reply.status(200).send({ message: 'Rating submitted successfully' });
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });
};

export default knowledgeRoutes;
