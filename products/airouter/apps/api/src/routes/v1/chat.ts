import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { RouterService, ChatCompletionRequest, ChatCompletionResponse } from '../../services/router.service.js';
import { Provider } from '../../types/index.js';
import crypto from 'crypto';

const chatCompletionSchema = z.object({
  model: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.literal(false).optional().default(false),
});

/**
 * Simulate a provider API call for the prototype.
 * In production, this would make real HTTP requests to the provider.
 */
async function simulateProviderCall(
  provider: Provider,
  _apiKey: string,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const lastMessage = request.messages[request.messages.length - 1];
  const modelId = request.model || provider.models[0]?.id || 'unknown';

  return {
    id: `chatcmpl-${crypto.randomBytes(12).toString('hex')}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `[AIRouter via ${provider.name}] This is a simulated response to: "${lastMessage.content.substring(0, 100)}"`,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.ceil(lastMessage.content.length / 4),
      completion_tokens: 50,
      total_tokens: Math.ceil(lastMessage.content.length / 4) + 50,
    },
    provider: provider.slug,
  };
}

const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/chat/completions - OpenAI-compatible proxy
  fastify.post('/chat/completions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const body = chatCompletionSchema.parse(request.body);
    const user = request.currentUser!;

    const router = new RouterService(fastify.prisma);

    const response = await router.routeCompletion(
      user.id,
      body as ChatCompletionRequest,
      simulateProviderCall,
    );

    return reply.send(response);
  });
};

export default chatRoutes;
