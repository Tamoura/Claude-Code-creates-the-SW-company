/**
 * OpenRouter API Client
 *
 * Reusable client for all LLM calls via OpenRouter.
 * Supports configurable model, timeout, and token limits.
 * EA generation may be slow, so default timeout is 60s.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(options: {
    apiKey: string;
    defaultModel?: string;
    timeoutMs?: number;
  }) {
    this.apiKey = options.apiKey;
    this.defaultModel =
      options.defaultModel ?? 'anthropic/claude-sonnet-4';
    this.timeoutMs = options.timeoutMs ?? 60000;
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://archforge.io',
            'X-Title': 'ArchForge EA Platform',
          },
          body: JSON.stringify({
            model: options?.model ?? this.defaultModel,
            messages,
            max_tokens: options?.maxTokens ?? 4000,
            temperature: options?.temperature ?? 0.7,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const text = await response
          .text()
          .catch(() => 'Unknown error');
        throw new Error(
          `OpenRouter API error ${response.status}: ${text}`,
        );
      }

      return (await response.json()) as OpenRouterResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}
