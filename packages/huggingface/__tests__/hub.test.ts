import { describe, it, expect, afterEach } from '@jest/globals';
import { HubClient } from '../src/clients/hub.js';
import { HuggingFaceError } from '../src/types/index.js';

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

let server: Server;

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

afterEach(async () => {
  await closeServer();
});

describe('HubClient', () => {
  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const client = new HubClient({ apiKey: 'hf_test_key' });
      expect(client).toBeInstanceOf(HubClient);
    });
  });

  describe('searchModels', () => {
    it('should search models with query params', async () => {
      let receivedUrl = '';

      const baseUrl = await createMockServer((req, res) => {
        receivedUrl = req.url ?? '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'gpt2', modelId: 'gpt2', downloads: 1000000, likes: 5000, tags: ['text-generation'], private: false },
          { id: 'bert-base', modelId: 'bert-base', downloads: 500000, likes: 3000, tags: ['fill-mask'], private: false },
        ]));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });

      const models = await client.searchModels({
        search: 'text-generation',
        limit: 10,
        sort: 'downloads',
        direction: 'desc',
      });

      expect(receivedUrl).toContain('/api/models');
      expect(receivedUrl).toContain('search=text-generation');
      expect(receivedUrl).toContain('limit=10');
      expect(receivedUrl).toContain('sort=downloads');
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('gpt2');
    });

    it('should filter by pipeline tag', async () => {
      let receivedUrl = '';

      const baseUrl = await createMockServer((req, res) => {
        receivedUrl = req.url ?? '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      await client.searchModels({ pipeline_tag: 'text-generation' });

      expect(receivedUrl).toContain('pipeline_tag=text-generation');
    });
  });

  describe('getModel', () => {
    it('should fetch model details', async () => {
      const mockModel = {
        id: 'meta-llama/Llama-3.1-8B',
        modelId: 'meta-llama/Llama-3.1-8B',
        sha: 'abc123',
        lastModified: '2024-01-01',
        tags: ['text-generation', 'pytorch'],
        pipeline_tag: 'text-generation',
        private: false,
        downloads: 2000000,
        likes: 10000,
      };

      const baseUrl = await createMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockModel));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      const model = await client.getModel('meta-llama/Llama-3.1-8B');

      expect(model.id).toBe('meta-llama/Llama-3.1-8B');
      expect(model.pipeline_tag).toBe('text-generation');
      expect(model.downloads).toBe(2000000);
    });
  });

  describe('searchDatasets', () => {
    it('should search datasets', async () => {
      const baseUrl = await createMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'imdb', downloads: 500000, likes: 1000, tags: ['text-classification'], private: false },
        ]));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      const datasets = await client.searchDatasets({ search: 'sentiment', limit: 5 });

      expect(datasets).toHaveLength(1);
      expect(datasets[0].id).toBe('imdb');
    });
  });

  describe('getDataset', () => {
    it('should fetch dataset details', async () => {
      const mockDataset = {
        id: 'imdb',
        sha: 'def456',
        lastModified: '2024-01-01',
        tags: ['text-classification'],
        private: false,
        downloads: 500000,
        likes: 1000,
      };

      const baseUrl = await createMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockDataset));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      const dataset = await client.getDataset('imdb');

      expect(dataset.id).toBe('imdb');
      expect(dataset.downloads).toBe(500000);
    });
  });

  describe('listModelFiles', () => {
    it('should list files in a model repo', async () => {
      let receivedUrl = '';

      const baseUrl = await createMockServer((req, res) => {
        receivedUrl = req.url ?? '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { rfilename: 'config.json', size: 1024 },
          { rfilename: 'model.safetensors', size: 4000000000, lfs: { size: 4000000000, sha256: 'abc', pointer_size: 134 } },
        ]));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      const files = await client.listModelFiles('gpt2');

      expect(receivedUrl).toContain('/api/models/gpt2/tree/main');
      expect(files).toHaveLength(2);
      expect(files[1].lfs).toBeDefined();
    });
  });

  describe('convenience methods', () => {
    it('trendingModels should sort by likes desc', async () => {
      let receivedUrl = '';

      const baseUrl = await createMockServer((req, res) => {
        receivedUrl = req.url ?? '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      await client.trendingModels(5);

      expect(receivedUrl).toContain('sort=likes');
      expect(receivedUrl).toContain('direction=-1');
      expect(receivedUrl).toContain('limit=5');
    });

    it('modelsByTask should filter by pipeline_tag', async () => {
      let receivedUrl = '';

      const baseUrl = await createMockServer((req, res) => {
        receivedUrl = req.url ?? '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });
      await client.modelsByTask('text-to-image', 10);

      expect(receivedUrl).toContain('pipeline_tag=text-to-image');
      expect(receivedUrl).toContain('sort=downloads');
    });
  });

  describe('error handling', () => {
    it('should throw HuggingFaceError on API failure', async () => {
      const baseUrl = await createMockServer((_req, res) => {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl });

      await expect(client.getModel('nonexistent/model')).rejects.toThrow(HuggingFaceError);
    });

    it('should handle timeout', async () => {
      const baseUrl = await createMockServer((_req, _res) => {
        // Never respond
      });

      const client = new HubClient({ apiKey: 'hf_test_key', baseUrl, timeoutMs: 100 });

      await expect(client.searchModels()).rejects.toThrow();
    });
  });
});
