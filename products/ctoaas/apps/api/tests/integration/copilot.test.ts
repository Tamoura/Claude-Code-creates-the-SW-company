/**
 * CopilotKit Runtime Integration Tests (Red Phase)
 *
 * Implements:
 *   FR-002 (Conversational AI Interface)
 *   FR-029 (AI Disclaimer on Responses)
 *
 * These tests define expected behavior for the CopilotKit
 * runtime endpoint. They use app.inject() with authenticated
 * requests against the real Fastify instance.
 *
 * They WILL FAIL because copilot routes are not registered yet.
 *
 * [IMPL-030]
 */
import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from '../helpers';

// ---------- helpers ----------

const COPILOT_URL = '/api/v1/copilot/run';

// ---------- suite ----------

describe('Copilot Routes', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await getApp();
    user = await createTestUser(app);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeApp();
  });

  describe('POST /api/v1/copilot/run', () => {
    test('[FR-002][AC-1] returns streaming response for valid query', async () => {
      const res = await app.inject({
        method: 'POST',
        url: COPILOT_URL,
        headers: authHeaders(user.accessToken),
        payload: {
          message: 'What are the trade-offs between microservices and monolith?',
          conversationId: null,
        },
      });

      // CopilotKit runtime returns 200 with streaming content
      expect(res.statusCode).toBe(200);

      const body = res.body;
      // Response should contain content (streaming or JSON)
      expect(body).toBeDefined();
      expect(body.length).toBeGreaterThan(0);
    });

    test('[FR-002] requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: COPILOT_URL,
        payload: {
          message: 'Should I use Kubernetes?',
        },
      });

      // No auth header -> 401
      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-029][AC-1] includes AI disclaimer in every response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: COPILOT_URL,
        headers: authHeaders(user.accessToken),
        payload: {
          message: 'Should we adopt GraphQL for our API layer?',
          conversationId: null,
        },
      });

      expect(res.statusCode).toBe(200);

      // Response must include AI disclaimer per BR-007
      // The disclaimer can be in the response body, headers, or metadata
      const body = res.body;
      const headers = res.headers;

      const hasDisclaimerInBody =
        body.toLowerCase().includes('ai-generated') ||
        body.toLowerCase().includes('not professional advice') ||
        body.toLowerCase().includes('disclaimer');

      const hasDisclaimerInHeader =
        headers['x-ai-disclaimer'] !== undefined;

      expect(hasDisclaimerInBody || hasDisclaimerInHeader).toBe(true);
    });

    test('[FR-002] returns 400 for empty message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: COPILOT_URL,
        headers: authHeaders(user.accessToken),
        payload: {
          message: '',
          conversationId: null,
        },
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    test('[FR-002] returns 429 when rate limited (LLM endpoint: 20/min)', async () => {
      // Build a separate app instance WITH rate limiting enabled
      const { buildApp } = await import('../../src/app');
      const rateLimitedApp = await buildApp({ skipRateLimit: false });
      await rateLimitedApp.ready();

      try {
        // Create a test user for this app instance
        const rlUser = await createTestUser(rateLimitedApp);

        // Fire requests beyond the 20/min LLM rate limit
        const requests = [];
        for (let i = 0; i < 25; i++) {
          requests.push(
            rateLimitedApp.inject({
              method: 'POST',
              url: COPILOT_URL,
              headers: authHeaders(rlUser.accessToken),
              payload: {
                message: `Rate limit test query ${i}`,
                conversationId: null,
              },
            })
          );
        }

        const responses = await Promise.all(requests);
        const statusCodes = responses.map((r) => r.statusCode);

        // At least one should be rate-limited (429)
        expect(statusCodes).toContain(429);
      } finally {
        await rateLimitedApp.close();
      }
    });
  });
});
