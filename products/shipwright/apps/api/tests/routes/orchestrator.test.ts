import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { OrchestratorEvent } from '../../src/lib/orchestrator/types';

// Mock the orchestrator to avoid real LLM calls
vi.mock('../../src/lib/orchestrator/simple-orchestrator', () => ({
  SimpleOrchestrator: vi.fn().mockImplementation(() => ({
    selectWorkflow: vi.fn().mockReturnValue('new-app'),
    routeTask: vi.fn(),
    handleRequest: vi.fn().mockImplementation(async function* (): AsyncIterable<OrchestratorEvent> {
      yield { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 5, pending: 5, inProgress: 0, completed: 0, failed: 0, readyTasks: ['plan'], isComplete: false } };
      yield { type: 'agent-started', agentRole: 'product-manager', taskId: 'plan', timestamp: Date.now() };
      yield {
        type: 'agent-completed', agentRole: 'product-manager', taskId: 'plan', timestamp: Date.now(),
        result: { role: 'product-manager', content: 'Here is the plan', artifacts: [], tokensIn: 50, tokensOut: 100, durationMs: 500 },
        graphStatus: { total: 5, pending: 4, inProgress: 0, completed: 1, failed: 0, readyTasks: ['design'], isComplete: false },
      };
      yield { type: 'workflow-completed', timestamp: Date.now(), graphStatus: { total: 5, pending: 0, inProgress: 0, completed: 5, failed: 0, readyTasks: [], isComplete: true } };
    }),
  })),
}));

// Mock openrouter
vi.mock('../../src/lib/openrouter', () => ({
  createModel: vi.fn().mockReturnValue({ modelId: 'test' }),
  AVAILABLE_MODELS: [
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'openrouter' },
  ],
}));

async function buildApp() {
  const { orchestratorRoutes } = await import('../../src/routes/orchestrator');
  const { healthRoutes } = await import('../../src/routes/health');
  const { modelsRoutes } = await import('../../src/routes/models');

  const app = Fastify();
  await app.register(orchestratorRoutes);
  await app.register(healthRoutes);
  await app.register(modelsRoutes);
  return app;
}

describe('API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const app = await buildApp();
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/models', () => {
    it('should return the available models list', async () => {
      const app = await buildApp();
      const response = await app.inject({ method: 'GET', url: '/api/models' });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].id).toBe('anthropic/claude-sonnet-4');
    });
  });

  describe('POST /api/orchestrator', () => {
    it('should return 400 if no prompt provided', async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/orchestrator',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return SSE stream with text/event-stream content type', async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/orchestrator',
        payload: { prompt: 'Build a todo app', modelId: 'anthropic/claude-sonnet-4' },
      });

      expect(response.headers['content-type']).toBe('text/event-stream');
    });

    it('should stream progress and text events', async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/orchestrator',
        payload: { prompt: 'Build a todo app', modelId: 'anthropic/claude-sonnet-4' },
      });

      const body = response.body;
      // Should contain progress events (2: prefix)
      expect(body).toContain('2:');
      // Should contain text events (0: prefix)
      expect(body).toContain('0:');
    });
  });
});
