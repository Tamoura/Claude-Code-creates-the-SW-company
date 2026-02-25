import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InferenceClient } from '../src/clients/inference.js';
import { HuggingFaceError } from '../src/types/index.js';

// Minimal mock server using Node's built-in http
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

let server: Server;
let baseUrl: string;

function createMockServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
  return new Promise((resolve) => {
    server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(`http://127.0.0.1:${addr.port}`);
      }
    });
  });
}

function closeServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
  });
}

afterEach(async () => {
  await closeServer();
});

describe('InferenceClient', () => {
  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const client = new InferenceClient({ apiKey: 'hf_test_key' });
      expect(client).toBeInstanceOf(InferenceClient);
    });

    it('should reject empty API key', () => {
      expect(() => new InferenceClient({ apiKey: '' })).toThrow();
    });
  });

  describe('textGeneration', () => {
    it('should send correct request and parse response', async () => {
      let receivedBody: Record<string, unknown> = {};
      let receivedAuth = '';

      baseUrl = await createMockServer(async (req, res) => {
        receivedAuth = req.headers.authorization ?? '';
        const body = await readBody(req);
        receivedBody = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ generated_text: 'Hello, world!' }]));
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      const result = await client.textGeneration({
        model: 'gpt2',
        inputs: 'Hello',
        parameters: { max_new_tokens: 50, temperature: 0.7 },
      });

      expect(receivedAuth).toBe('Bearer hf_test_key');
      expect(receivedBody).toEqual({
        inputs: 'Hello',
        parameters: { max_new_tokens: 50, temperature: 0.7 },
      });
      expect(result).toEqual([{ generated_text: 'Hello, world!' }]);
    });

    it('should handle API errors', async () => {
      baseUrl = await createMockServer((_req, res) => {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Rate limit exceeded');
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      await expect(
        client.textGeneration({ model: 'gpt2', inputs: 'Hello' }),
      ).rejects.toThrow(HuggingFaceError);
    });

    it('should handle timeouts', async () => {
      baseUrl = await createMockServer((_req, _res) => {
        // Never respond — let it timeout
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
        timeoutMs: 100,
      });

      await expect(
        client.textGeneration({ model: 'gpt2', inputs: 'Hello' }),
      ).rejects.toThrow();
    });
  });

  describe('embeddings', () => {
    it('should return embedding vectors', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];

      baseUrl = await createMockServer(async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockEmbeddings));
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      const result = await client.embeddings({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: ['Hello', 'World'],
      });

      expect(result).toEqual(mockEmbeddings);
    });
  });

  describe('textClassification', () => {
    it('should return classification results', async () => {
      const mockResult = [[{ label: 'POSITIVE', score: 0.98 }]];

      baseUrl = await createMockServer(async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResult));
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      const result = await client.textClassification({
        model: 'distilbert-base-uncased-finetuned-sst-2-english',
        inputs: 'I love this product!',
      });

      expect(result[0][0].label).toBe('POSITIVE');
      expect(result[0][0].score).toBeGreaterThan(0.9);
    });
  });

  describe('summarization', () => {
    it('should return summary text', async () => {
      const mockResult = [{ summary_text: 'This is a summary.' }];

      baseUrl = await createMockServer(async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResult));
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      const result = await client.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: 'A very long article about technology...',
        parameters: { max_length: 100 },
      });

      expect(result[0].summary_text).toBe('This is a summary.');
    });
  });

  describe('questionAnswering', () => {
    it('should return answer with score', async () => {
      const mockResult = { answer: 'Paris', score: 0.95, start: 30, end: 35 };

      baseUrl = await createMockServer(async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResult));
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      const result = await client.questionAnswering({
        model: 'deepset/roberta-base-squad2',
        inputs: {
          question: 'What is the capital of France?',
          context: 'France is a country. The capital of France is Paris.',
        },
      });

      expect(result.answer).toBe('Paris');
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('zeroShotClassification', () => {
    it('should classify with candidate labels', async () => {
      const mockResult = {
        sequence: 'I have a problem with my computer',
        labels: ['technology', 'sports', 'food'],
        scores: [0.95, 0.03, 0.02],
      };

      baseUrl = await createMockServer(async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResult));
      });

      const client = new InferenceClient({
        apiKey: 'hf_test_key',
        inferenceBaseUrl: baseUrl,
      });

      const result = await client.zeroShotClassification({
        model: 'facebook/bart-large-mnli',
        inputs: 'I have a problem with my computer',
        parameters: {
          candidate_labels: ['technology', 'sports', 'food'],
        },
      });

      expect(result.labels[0]).toBe('technology');
      expect(result.scores[0]).toBeGreaterThan(0.5);
    });
  });

  describe('error handling', () => {
    it('should include status code in HuggingFaceError', async () => {
      baseUrl = await createMockServer((_req, res) => {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
      });

      const client = new InferenceClient({
        apiKey: 'hf_bad_key',
        inferenceBaseUrl: baseUrl,
      });

      try {
        await client.textGeneration({ model: 'gpt2', inputs: 'test' });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HuggingFaceError);
        const hfError = error as HuggingFaceError;
        expect(hfError.statusCode).toBe(401);
        expect(hfError.errorType).toBe('InferenceError');
      }
    });

    it('should serialize error to JSON', () => {
      const error = new HuggingFaceError('Test error', 500, 'TestError');
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'HuggingFaceError',
        message: 'Test error',
        statusCode: 500,
        errorType: 'TestError',
      });
    });
  });
});
