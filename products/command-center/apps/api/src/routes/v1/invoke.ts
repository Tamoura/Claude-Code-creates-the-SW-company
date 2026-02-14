import type { FastifyInstance } from 'fastify';
import {
  createJob,
  startJob,
  cancelJob,
  getJob,
  listJobs,
  getJobOutput,
} from '../../services/invoke.service.js';

/** Allowed command prefixes — safety guard against arbitrary execution */
const ALLOWED_PREFIXES = [
  'claude',           // Claude Code CLI
  'npm run',          // npm scripts
  'npm test',         // tests
  'npx ',             // npx tools
  'git status',       // git read-only
  'git log',          // git read-only
  'git diff',         // git read-only
  'git branch',       // git read-only
  'docker compose',   // Docker operations
  'docker-compose',   // Docker operations (legacy)
];

function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim();
  return ALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export async function invokeRoutes(fastify: FastifyInstance) {
  /** Create and start a new invocation */
  fastify.post<{ Body: { command: string } }>('/invoke', async (request, reply) => {
    const { command } = request.body ?? {};
    if (!command || typeof command !== 'string') {
      return reply.status(400).send({ error: 'Command is required' });
    }

    if (!isCommandAllowed(command)) {
      return reply.status(403).send({
        error: 'Command not allowed',
        detail: `Command must start with one of: ${ALLOWED_PREFIXES.join(', ')}`,
      });
    }

    try {
      const job = createJob(command);
      startJob(job.id);
      return reply.status(201).send({ job: sanitizeJob(job) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      return reply.status(429).send({ error: message });
    }
  });

  /** List all jobs */
  fastify.get<{ Querystring: { limit?: string } }>('/invoke', async (request) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50);
    return { jobs: listJobs(limit).map(sanitizeJob) };
  });

  /** Get a specific job */
  fastify.get<{ Params: { id: string } }>('/invoke/:id', async (request, reply) => {
    const job = getJob(request.params.id);
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    return { job: sanitizeJob(job) };
  });

  /** Stream job output via SSE */
  fastify.get<{ Params: { id: string } }>('/invoke/:id/stream', async (request, reply) => {
    const job = getJob(request.params.id);
    if (!job) return reply.status(404).send({ error: 'Job not found' });

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    let lastLine = 0;
    const interval = setInterval(() => {
      const output = getJobOutput(job.id, lastLine);
      if (!output) {
        clearInterval(interval);
        reply.raw.end();
        return;
      }

      if (output.lines.length > 0) {
        for (const line of output.lines) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'output', line })}\n\n`);
        }
        lastLine = output.totalLines;
      }

      // Check if job is done
      const current = getJob(job.id);
      if (current && (current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled')) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'done', status: current.status, exitCode: current.exitCode })}\n\n`);
        clearInterval(interval);
        reply.raw.end();
      }
    }, 200);

    // Clean up on client disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  /** Cancel a running job */
  fastify.post<{ Params: { id: string } }>('/invoke/:id/cancel', async (request, reply) => {
    try {
      const job = cancelJob(request.params.id);
      return { job: sanitizeJob(job) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel job';
      return reply.status(400).send({ error: message });
    }
  });
}

function sanitizeJob(job: ReturnType<typeof getJob>) {
  if (!job) return null;
  return {
    id: job.id,
    command: job.command,
    status: job.status,
    outputLines: job.output.length,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    exitCode: job.exitCode,
  };
}
