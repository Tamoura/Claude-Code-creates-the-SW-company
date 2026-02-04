import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'openrouter' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter' },
];

export function createModel(modelId: string) {
  return openrouter(modelId);
}
