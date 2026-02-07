import { FastifyPluginAsync } from 'fastify';
import { RepoService } from './service.js';
import { RepoHandlers } from './handlers.js';

const repoRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new RepoService(fastify.prisma);
  const handlers = new RepoHandlers(service);

  // All routes require authentication + team membership
  fastify.addHook('onRequest', async (request, reply) => {
    await (fastify as any).authenticate(request, reply);
  });
  fastify.addHook('preHandler', async (request, reply) => {
    await (fastify as any).verifyTeamMembership(request, reply);
  });

  /**
   * GET /api/v1/repos
   * List connected repos for a team.
   */
  fastify.get('/', async (request, reply) => {
    return handlers.listRepos(request, reply);
  });

  /**
   * GET /api/v1/repos/available
   * List repos available from GitHub that can be connected.
   */
  fastify.get('/available', async (request, reply) => {
    return handlers.availableRepos(request, reply);
  });

  /**
   * POST /api/v1/repos
   * Connect a new repository.
   */
  fastify.post('/', async (request, reply) => {
    return handlers.connectRepo(request, reply);
  });

  /**
   * DELETE /api/v1/repos/:id
   * Disconnect a repository (soft delete).
   */
  fastify.delete('/:id', async (request, reply) => {
    return handlers.disconnectRepo(request, reply);
  });

  /**
   * GET /api/v1/repos/:id/sync-status
   * Get sync status for a specific repo.
   */
  fastify.get('/:id/sync-status', async (request, reply) => {
    return handlers.getSyncStatus(request, reply);
  });
};

export default repoRoutes;
