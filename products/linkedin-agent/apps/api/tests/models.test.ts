import { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  cleanDB,
  disconnectTestPrisma,
} from './setup';

// Mock global fetch so we never call the real OpenRouter API
const originalFetch = global.fetch;

beforeAll(() => {
  // Default mock: return empty models list
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
    text: async () => '{}',
  }) as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Models endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDB();
    // Reset fetch mock before each test
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
      text: async () => '{}',
    });
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  // ===== GET /api/models =====

  describe('GET /api/models', () => {
    it('returns defaults and availableCount', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/models',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.defaults).toBeDefined();
      expect(body).toHaveProperty('availableCount');
      expect(typeof body.availableCount).toBe('number');
    });

    it('defaults has writing, analysis, image, translation keys', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/models',
      });

      const body = res.json();
      expect(body.defaults).toHaveProperty('writing');
      expect(body.defaults).toHaveProperty('analysis');
      expect(body.defaults).toHaveProperty('image');
      expect(body.defaults).toHaveProperty('translation');
    });

    it('default models are non-empty strings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/models',
      });

      const body = res.json();
      expect(typeof body.defaults.writing).toBe('string');
      expect(body.defaults.writing.length).toBeGreaterThan(0);
      expect(typeof body.defaults.analysis).toBe('string');
      expect(body.defaults.analysis.length).toBeGreaterThan(0);
    });

    it('returns available models when fetch succeeds', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'openai/gpt-4o', name: 'GPT-4o' },
            { id: 'anthropic/claude-3.5', name: 'Claude 3.5' },
          ],
        }),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/models',
      });

      const body = res.json();
      expect(body.availableCount).toBe(2);
      expect(body.available).toHaveLength(2);
    });

    it('still returns defaults when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/models',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.defaults).toBeDefined();
      expect(body.availableCount).toBe(0);
    });
  });

  // ===== GET /api/models/usage =====

  describe('GET /api/models/usage', () => {
    it('returns period, totals, byModel, and byTaskType', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/models/usage',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      expect(body.period).toBeDefined();
      expect(body.period.days).toBe(30);
      expect(body.period.since).toBeDefined();

      expect(body.totals).toBeDefined();
      expect(body.totals).toHaveProperty('calls');
      expect(body.totals).toHaveProperty('promptTokens');
      expect(body.totals).toHaveProperty('completionTokens');
      expect(body.totals).toHaveProperty('totalCostUsd');
      expect(body.totals).toHaveProperty('totalDurationMs');

      expect(Array.isArray(body.byModel)).toBe(true);
      expect(Array.isArray(body.byTaskType)).toBe(true);
    });

    it('returns zero totals when no generation logs exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/models/usage',
      });

      const body = res.json();
      expect(body.totals.calls).toBe(0);
      expect(body.totals.promptTokens).toBe(0);
      expect(body.totals.completionTokens).toBe(0);
      expect(body.totals.totalCostUsd).toBe(0);
      expect(body.totals.totalDurationMs).toBe(0);
    });

    it('accepts a custom days query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/models/usage?days=7',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.period.days).toBe(7);
    });
  });
});
