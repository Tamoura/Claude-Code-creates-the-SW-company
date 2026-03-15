import { FastifyPluginAsync } from 'fastify';
import { ConversationService } from '../services/conversation.service';
import { SearchService } from '../services/search.service';
import {
  createConversationSchema,
  updateConversationSchema,
  conversationListQuerySchema,
  searchQuerySchema,
} from '../validations/conversation.validation';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';

const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  const conversationService = new ConversationService(fastify.prisma);
  const searchService = new SearchService(fastify.prisma);

  // ── GET /api/v1/conversations ─────────────────────────────────
  fastify.get(
    '/api/v1/conversations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const query = conversationListQuerySchema.safeParse(
        request.query || {}
      );

      const page = query.success ? query.data.page : 1;
      const limit = query.success ? query.data.limit : 20;

      const result = await conversationService.list(
        userId,
        page,
        limit
      );

      return sendSuccess(reply, result);
    }
  );

  // ── POST /api/v1/conversations ────────────────────────────────
  fastify.post(
    '/api/v1/conversations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createConversationSchema.safeParse(
        request.body || {}
      );
      if (!parsed.success) {
        throw parsed.error;
      }

      const userId = (request.user as { sub: string }).sub;
      const conversation = await conversationService.create(
        userId,
        parsed.data.title
      );

      return sendSuccess(reply, conversation, 201);
    }
  );

  // ── GET /api/v1/conversations/search ──────────────────────────
  fastify.get(
    '/api/v1/conversations/search',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const parsed = searchQuerySchema.safeParse(
        request.query || {}
      );
      if (!parsed.success) {
        throw AppError.badRequest('Query parameter "q" is required');
      }

      const results = await searchService.searchConversations(
        userId,
        parsed.data.q
      );

      return sendSuccess(reply, { results });
    }
  );

  // ── GET /api/v1/conversations/:id ─────────────────────────────
  fastify.get(
    '/api/v1/conversations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const { id } = request.params as { id: string };

      const conversation =
        await conversationService.getWithMessages(id, userId);

      return sendSuccess(reply, conversation);
    }
  );

  // ── PUT /api/v1/conversations/:id ─────────────────────────────
  fastify.put(
    '/api/v1/conversations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = updateConversationSchema.safeParse(
        request.body || {}
      );
      if (!parsed.success) {
        throw parsed.error;
      }

      const userId = (request.user as { sub: string }).sub;
      const { id } = request.params as { id: string };

      const conversation = await conversationService.updateTitle(
        id,
        userId,
        parsed.data.title
      );

      return sendSuccess(reply, conversation);
    }
  );

  // ── DELETE /api/v1/conversations/:id ──────────────────────────
  fastify.delete(
    '/api/v1/conversations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const { id } = request.params as { id: string };

      await conversationService.delete(id, userId);

      return sendSuccess(reply, {
        message: 'Conversation deleted',
      });
    }
  );

  // ── POST /api/v1/conversations/:id/generate-title ─────────────
  fastify.post(
    '/api/v1/conversations/:id/generate-title',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const { id } = request.params as { id: string };

      const title = await conversationService.generateTitle(
        id,
        userId
      );

      return sendSuccess(reply, { title });
    }
  );
};

export default conversationRoutes;
