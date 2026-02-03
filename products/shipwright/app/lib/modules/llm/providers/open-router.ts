import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export default class OpenRouterProvider extends BaseProvider {
  name = 'OpenRouter';
  getApiKeyLink = 'https://openrouter.ai/settings/keys';

  config = {
    apiTokenKey: 'OPEN_ROUTER_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'anthropic/claude-sonnet-4',
      label: 'Claude Sonnet 4',
      provider: 'OpenRouter',
      maxTokenAllowed: 200000,
    },
    {
      name: 'anthropic/claude-3.5-haiku',
      label: 'Claude 3.5 Haiku (fast)',
      provider: 'OpenRouter',
      maxTokenAllowed: 200000,
    },
    {
      name: 'openai/gpt-4.1',
      label: 'GPT-4.1',
      provider: 'OpenRouter',
      maxTokenAllowed: 1048576,
    },
    {
      name: 'google/gemini-2.5-pro-preview',
      label: 'Gemini 2.5 Pro',
      provider: 'OpenRouter',
      maxTokenAllowed: 1048576,
    },
    {
      name: 'qwen/qwen3-coder',
      label: 'Qwen3 Coder 480B A35B',
      provider: 'OpenRouter',
      maxTokenAllowed: 262144,
    },
  ];

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPEN_ROUTER_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openRouter = createOpenRouter({
      apiKey,
    });
    const instance = openRouter.chat(model) as LanguageModelV1;

    return instance;
  }
}
