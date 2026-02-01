import { FastifyRequest, FastifyReply } from 'fastify';

export async function healthCheck(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  let dbStatus = 'disconnected';

  try {
    await request.server.db.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const statusCode = dbStatus === 'connected' ? 200 : 503;

  reply.status(statusCode).send({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
}
