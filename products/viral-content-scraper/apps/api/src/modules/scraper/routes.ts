import { FastifyInstance } from 'fastify';
import { ScraperService } from './service';

export async function scraperRoutes(fastify: FastifyInstance) {
  const service = new ScraperService(fastify.prisma, fastify.redis);

  // POST /api/v1/scraper/run — Trigger a scrape cycle (admin only)
  fastify.post('/run', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    // Run asynchronously — return immediately
    const results = await service.runFullScrape();
    return reply.status(200).send({
      message: 'Scrape completed',
      results,
    });
  });

  // GET /api/v1/scraper/jobs — Get scrape job history
  fastify.get('/jobs', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const jobs = await service.getJobs();
    return reply.send({ jobs });
  });
}
