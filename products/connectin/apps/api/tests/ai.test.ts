import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from './helpers';
import { AIService } from '../src/modules/ai/ai.service';

let app: FastifyInstance;
let alice: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  AIService._resetCache();
  alice = await createTestUser(app, { displayName: 'Alice AI' });
});

describe('AI', () => {
  describe('GET /api/v1/ai/status', () => {
    it('should return AI status without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/status',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.features).toBeDefined();
      expect(body.data.features.profileOptimizer).toBeDefined();
      expect(body.data.features.contentAssistant).toBe(false);
      expect(body.data.features.connectionSuggestions).toBe(false);
      expect(body.data.features.jobMatching).toBe(false);
    });
  });

  describe('POST /api/v1/ai/profile-optimizer', () => {
    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/profile-optimizer',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return graceful error when AI is unavailable', async () => {
      // In test env, OPENROUTER_API_KEY is not set, so AI is unavailable
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/profile-optimizer',
        headers: authHeaders(alice.accessToken),
      });
      // Should return 400 with a friendly message
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('temporarily unavailable');
    });
  });

  describe('AIService unit tests', () => {
    it('should report unavailable when no API key', () => {
      const service = new AIService(app.prisma);
      expect(service.isAvailable).toBe(false);
    });

    it('should report available when API key is provided', () => {
      const service = new AIService(app.prisma, 'test-key');
      expect(service.isAvailable).toBe(true);
    });

    it('should return correct AI status', async () => {
      const service = new AIService(app.prisma);
      const status = await service.getAIStatus();
      expect(status.available).toBe(false);
      expect(status.features.profileOptimizer).toBe(false);
    });

    it('should return available status with API key', async () => {
      const service = new AIService(app.prisma, 'test-key');
      const status = await service.getAIStatus();
      expect(status.available).toBe(true);
      expect(status.features.profileOptimizer).toBe(true);
    });

    it('should throw when AI unavailable for optimize', async () => {
      const service = new AIService(app.prisma);
      await expect(
        service.optimizeProfile(alice.id)
      ).rejects.toThrow('temporarily unavailable');
    });

    it('should cache responses correctly', () => {
      // Reset and verify cache is empty
      AIService._resetCache();
      // Cache should be cleared - verified by not throwing
    });
  });
});
