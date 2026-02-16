import { z } from 'zod';
import { getEnv } from '../lib/env';
import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  durationMs: number;
}

export type LLMTaskType = 'writing' | 'analysis' | 'image' | 'translation';

interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
}

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  top_provider: {
    max_completion_tokens: number;
  };
}

// Cost per token in USD (approximate, from OpenRouter pricing)
const MODEL_COSTS: Record<string, { prompt: number; completion: number }> = {
  'anthropic/claude-sonnet-4.5': { prompt: 0.000003, completion: 0.000015 },
  'google/gemini-2.0-flash-001': { prompt: 0.0000001, completion: 0.0000004 },
  'openai/dall-e-3': { prompt: 0.00004, completion: 0.00012 },
  'openai/gpt-4o': { prompt: 0.0000025, completion: 0.00001 },
  'anthropic/claude-3.5-haiku': { prompt: 0.0000008, completion: 0.000004 },
};

const openRouterResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(z.object({
    message: z.object({
      role: z.string(),
      content: z.string(),
    }),
    finish_reason: z.string().optional(),
  })).min(1, 'Response must have at least one choice'),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number().optional(),
  }).optional(),
});

/**
 * Select the best model for a given task type.
 */
export function selectModel(taskType: LLMTaskType): string {
  const env = getEnv();
  switch (taskType) {
    case 'writing':
      return env.DEFAULT_WRITING_MODEL;
    case 'analysis':
      return env.DEFAULT_ANALYSIS_MODEL;
    case 'image':
      return env.DEFAULT_IMAGE_MODEL;
    case 'translation':
      // Translation uses the writing model for quality
      return env.DEFAULT_WRITING_MODEL;
    default:
      return env.DEFAULT_WRITING_MODEL;
  }
}

/**
 * Calculate cost based on model and token usage.
 */
function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || { prompt: 0.000003, completion: 0.000015 };
  return (promptTokens * costs.prompt) + (completionTokens * costs.completion);
}

/**
 * Extract provider name from model ID (e.g., "anthropic/claude-3" -> "anthropic").
 */
function extractProvider(model: string): string {
  const parts = model.split('/');
  return parts[0] || 'unknown';
}

/**
 * Call an LLM via the OpenRouter API.
 */
export async function callLLM(params: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const env = getEnv();
  const { model, messages, temperature = 0.7, maxTokens = 2048 } = params;

  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.FRONTEND_URL,
        'X-Title': 'LinkedIn AI Agent',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OpenRouter API call timed out after 60 seconds (model: ${model})`);
    }
    throw error;
  }

  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('OpenRouter API error', new Error(errorBody), {
      status: response.status,
      model,
    });
    throw new Error(
      `OpenRouter API error (${response.status}): ${errorBody}`
    );
  }

  const rawData = await response.json();
  const parseResult = openRouterResponseSchema.safeParse(rawData);
  if (!parseResult.success) {
    logger.error('Invalid OpenRouter response structure', new Error(parseResult.error.message), { model });
    throw new Error(`OpenRouter returned invalid response: ${parseResult.error.message}`);
  }
  const data = parseResult.data;

  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const costUsd = calculateCost(model, promptTokens, completionTokens);

  const content = data.choices?.[0]?.message?.content ?? '';

  logger.debug('LLM call completed', {
    model,
    promptTokens,
    completionTokens,
    costUsd,
    durationMs,
  });

  return {
    content,
    model: data.model || model,
    provider: extractProvider(model),
    promptTokens,
    completionTokens,
    costUsd,
    durationMs,
  };
}

/**
 * Fetch available models from OpenRouter.
 */
export async function fetchAvailableModels(): Promise<OpenRouterModel[]> {
  const env = getEnv();

  const response = await fetch(`${env.OPENROUTER_BASE_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const data = (await response.json()) as { data: OpenRouterModel[] };
  return data.data || [];
}
