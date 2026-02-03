import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream } from 'ai';
import { SimpleOrchestrator } from '~/lib/.server/orchestrator';
import type { AgentContext, AgentResult, OrchestratorEvent } from '~/lib/.server/orchestrator';
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';
import type { ProgressAnnotation } from '~/types/context';

export async function action(args: ActionFunctionArgs) {
  return orchestratorAction(args);
}

const logger = createScopedLogger('api.orchestrator');

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

function extractPromptFromMessage(content: string): {
  model: string;
  provider: string;
  prompt: string;
} {
  const modelMatch = content.match(MODEL_REGEX);
  const providerMatch = content.match(PROVIDER_REGEX);

  const model = modelMatch ? modelMatch[1] : 'anthropic/claude-sonnet-4-20250514';
  const provider = providerMatch ? providerMatch[1] : 'OpenRouter';
  const prompt = content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').trim();

  return { model, provider, prompt };
}

function flattenFiles(files: Record<string, any>): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [path, dirent] of Object.entries(files)) {
    if (dirent && typeof dirent === 'object' && 'content' in dirent) {
      flat[path] = dirent.content;
    }
  }

  return flat;
}

function formatAgentRole(role: string): string {
  return role
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function orchestratorAction({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json<{
      messages?: any[];
      files?: any;
      contextOptimization?: boolean;
      chatMode?: string;
    }>();

    const messages = body.messages || [];
    const files = body.files || {};

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');

    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: true, message: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cookieHeader = request.headers.get('Cookie');
    const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');
    const { model, provider, prompt } = extractPromptFromMessage(lastUserMessage.content);

    const orchestrator = new SimpleOrchestrator();

    const agentContext: AgentContext = {
      projectId: 'default',
      conversationHistory: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      files: flattenFiles(files),
      previousResults: [],
      model,
      provider,
      apiKeys,
    };

    const encoder = new TextEncoder();
    let progressCounter = 1;
    const accumulatedResults: AgentResult[] = [];

    const dataStream = createDataStream({
      async execute(dataStream) {
        for await (const event of orchestrator.handleRequest(prompt, agentContext)) {
          handleEvent(event, dataStream);
        }
      },
      onError: (error: any) => {
        logger.error('Orchestrator stream error:', error);
        return `Custom error: ${error?.message || 'Unknown error'}`;
      },
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          const str = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
          controller.enqueue(encoder.encode(str));
        },
      }),
    );

    function handleEvent(event: OrchestratorEvent, dataStream: any) {
      switch (event.type) {
        case 'workflow-started':
          dataStream.writeData({
            type: 'progress',
            label: 'orchestrator',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Starting multi-agent workflow',
          } satisfies ProgressAnnotation);
          break;

        case 'agent-started':
          dataStream.writeData({
            type: 'progress',
            label: event.agentRole!,
            status: 'in-progress',
            order: progressCounter++,
            message: `${formatAgentRole(event.agentRole!)} is working...`,
          } satisfies ProgressAnnotation);
          break;

        case 'agent-completed': {
          if (event.result) {
            accumulatedResults.push(event.result);

            const header = `\n\n---\n**${formatAgentRole(event.agentRole!)}**\n\n`;
            dataStream.write(`0:${JSON.stringify(header)}\n`);
            dataStream.write(`0:${JSON.stringify(event.result.content)}\n`);
          }

          dataStream.writeData({
            type: 'progress',
            label: event.agentRole!,
            status: 'complete',
            order: progressCounter++,
            message: `${formatAgentRole(event.agentRole!)} completed`,
          } satisfies ProgressAnnotation);
          break;
        }

        case 'agent-failed':
          dataStream.write(`0:${JSON.stringify(`\n\n⚠️ ${formatAgentRole(event.agentRole!)} failed: ${event.content}\n`)}\n`);
          dataStream.writeData({
            type: 'progress',
            label: event.agentRole!,
            status: 'complete',
            order: progressCounter++,
            message: `${formatAgentRole(event.agentRole!)} failed`,
          } satisfies ProgressAnnotation);
          break;

        case 'workflow-completed': {
          const totalUsage = {
            completionTokens: accumulatedResults.reduce((sum, r) => sum + r.tokensOut, 0),
            promptTokens: accumulatedResults.reduce((sum, r) => sum + r.tokensIn, 0),
            totalTokens: accumulatedResults.reduce((sum, r) => sum + r.tokensIn + r.tokensOut, 0),
          };

          dataStream.writeMessageAnnotation({
            type: 'usage',
            value: totalUsage,
          });

          dataStream.writeData({
            type: 'progress',
            label: 'orchestrator',
            status: 'complete',
            order: progressCounter++,
            message: 'All agents completed',
          } satisfies ProgressAnnotation);
          break;
        }

        case 'workflow-failed':
          dataStream.write(`0:${JSON.stringify('\n\n❌ Workflow failed. Some agents could not complete their tasks.\n')}\n`);
          dataStream.writeData({
            type: 'progress',
            label: 'orchestrator',
            status: 'complete',
            order: progressCounter++,
            message: 'Workflow failed',
          } satisfies ProgressAnnotation);
          break;
      }
    }

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    logger.error('Orchestrator action error:', error);

    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
