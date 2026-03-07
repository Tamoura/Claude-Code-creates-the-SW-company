/**
 * tests/unit/openrouter.test.ts — OpenRouter API client tests
 *
 * Tests the OpenRouter client wrapper used for AI-powered assessments.
 * Uses a fake fetch to avoid real API calls.
 */

import {
  OpenRouterClient,
  OpenRouterConfig,
  OpenRouterError,
  ChatMessage,
} from '../../src/services/openrouter';

function makeFakeFetch(response: object, status = 200): typeof globalThis.fetch {
  return async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => response,
      text: async () => JSON.stringify(response),
    }) as Response;
}

const DEFAULT_CONFIG: OpenRouterConfig = {
  apiKey: 'test-key-123',
  model: 'meta-llama/llama-3.1-8b-instruct:free',
  baseUrl: 'https://openrouter.ai/api/v1',
  maxTokens: 1024,
  temperature: 0.3,
};

describe('OpenRouterClient', () => {
  test('should send a chat completion request and return content', async () => {
    const fakeFetch = makeFakeFetch({
      choices: [{ message: { role: 'assistant', content: 'Hello from AI' } }],
    });
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
    const result = await client.chat(messages);

    expect(result).toBe('Hello from AI');
  });

  test('should include system message when provided', async () => {
    let capturedBody: string | undefined;
    const fakeFetch: typeof globalThis.fetch = async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'response' } }],
        }),
      } as Response;
    };
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    await client.chat(
      [{ role: 'user', content: 'test' }],
      { systemPrompt: 'You are a helpful assistant.' }
    );

    const parsed = JSON.parse(capturedBody!);
    expect(parsed.messages[0]).toEqual({
      role: 'system',
      content: 'You are a helpful assistant.',
    });
    expect(parsed.messages[1]).toEqual({ role: 'user', content: 'test' });
  });

  test('should send correct headers including Authorization', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fakeFetch: typeof globalThis.fetch = async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        }),
      } as Response;
    };
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    await client.chat([{ role: 'user', content: 'test' }]);

    expect(capturedHeaders!['Authorization']).toBe('Bearer test-key-123');
    expect(capturedHeaders!['Content-Type']).toBe('application/json');
    expect(capturedHeaders!['HTTP-Referer']).toBe('https://ai-fluency.connectsw.com');
  });

  test('should use configured model in request body', async () => {
    let capturedBody: string | undefined;
    const fakeFetch: typeof globalThis.fetch = async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        }),
      } as Response;
    };
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    await client.chat([{ role: 'user', content: 'test' }]);

    const parsed = JSON.parse(capturedBody!);
    expect(parsed.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    expect(parsed.max_tokens).toBe(1024);
    expect(parsed.temperature).toBe(0.3);
  });

  test('should throw OpenRouterError on API error response', async () => {
    const fakeFetch = makeFakeFetch(
      { error: { message: 'Rate limit exceeded' } },
      429
    );
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    await expect(
      client.chat([{ role: 'user', content: 'test' }])
    ).rejects.toThrow(OpenRouterError);
  });

  test('should throw OpenRouterError with status code', async () => {
    const fakeFetch = makeFakeFetch(
      { error: { message: 'Unauthorized' } },
      401
    );
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    try {
      await client.chat([{ role: 'user', content: 'test' }]);
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OpenRouterError);
      expect((err as OpenRouterError).statusCode).toBe(401);
    }
  });

  test('should throw OpenRouterError on network failure', async () => {
    const fakeFetch: typeof globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    await expect(
      client.chat([{ role: 'user', content: 'test' }])
    ).rejects.toThrow(OpenRouterError);
  });

  test('should return empty string when response has no choices', async () => {
    const fakeFetch = makeFakeFetch({ choices: [] });
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    const result = await client.chat([{ role: 'user', content: 'test' }]);
    expect(result).toBe('');
  });

  test('should override temperature per-request', async () => {
    let capturedBody: string | undefined;
    const fakeFetch: typeof globalThis.fetch = async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        }),
      } as Response;
    };
    const client = new OpenRouterClient(DEFAULT_CONFIG, fakeFetch);

    await client.chat(
      [{ role: 'user', content: 'test' }],
      { temperature: 0.9 }
    );

    const parsed = JSON.parse(capturedBody!);
    expect(parsed.temperature).toBe(0.9);
  });
});
