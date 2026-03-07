/**
 * services/openrouter.ts — OpenRouter API client
 *
 * Wraps OpenRouter's OpenAI-compatible chat completion API.
 * Uses native fetch (Node 20+) — no external HTTP dependencies.
 * Supports dependency injection of fetch for testability.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

export interface ChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export class OpenRouterClient {
  private config: OpenRouterConfig;
  private fetchFn: typeof globalThis.fetch;

  constructor(config: OpenRouterConfig, fetchFn?: typeof globalThis.fetch) {
    this.config = config;
    this.fetchFn = fetchFn ?? globalThis.fetch;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const allMessages: ChatMessage[] = [];
    if (options?.systemPrompt) {
      allMessages.push({ role: 'system', content: options.systemPrompt });
    }
    allMessages.push(...messages);

    const body = {
      model: this.config.model,
      messages: allMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
    };

    let response: Response;
    try {
      response = await this.fetchFn(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-fluency.connectsw.com',
          'X-Title': 'AI Fluency Platform',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new OpenRouterError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = (errorBody as { error?: { message?: string } })?.error?.message
        ?? `HTTP ${response.status}: ${response.statusText}`;
      throw new OpenRouterError(message, response.status);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? '';
  }
}
