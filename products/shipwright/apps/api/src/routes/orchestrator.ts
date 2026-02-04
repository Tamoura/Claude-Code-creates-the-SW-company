import type { FastifyInstance } from 'fastify';
import { SimpleOrchestrator } from '../lib/orchestrator/simple-orchestrator';
import { createModel } from '../lib/openrouter';
import { StreamWriter } from '../lib/stream-writer';
import type { AgentContext } from '../lib/orchestrator/types';

interface OrchestratorBody {
  prompt: string;
  modelId?: string;
}

export async function orchestratorRoutes(app: FastifyInstance) {
  app.post<{ Body: OrchestratorBody }>('/api/orchestrator', async (request, reply) => {
    const { prompt, modelId } = request.body || {};

    if (!prompt) {
      return reply.status(400).send({ error: 'prompt is required' });
    }

    const model = createModel(modelId || 'anthropic/claude-sonnet-4');

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.hijack();

    const writer = new StreamWriter(reply);
    const orchestrator = new SimpleOrchestrator();

    const context: AgentContext = {
      projectId: `proj_${Date.now()}`,
      conversationHistory: [{ role: 'user', content: prompt }],
      files: {},
      previousResults: [],
      model,
      modelName: modelId || 'anthropic/claude-sonnet-4',
    };

    try {
      for await (const event of orchestrator.handleRequest(prompt, context)) {
        writer.writeProgress({
          type: event.type,
          agentRole: event.agentRole,
          taskId: event.taskId,
          graphStatus: event.graphStatus,
          timestamp: event.timestamp,
        });

        if (event.type === 'agent-completed' && event.result) {
          writer.writeText(event.result.content);
          writer.writeUsage({
            tokensIn: event.result.tokensIn,
            tokensOut: event.result.tokensOut,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      writer.writeProgress({ type: 'error', message });
    } finally {
      writer.close();
    }
  });
}
