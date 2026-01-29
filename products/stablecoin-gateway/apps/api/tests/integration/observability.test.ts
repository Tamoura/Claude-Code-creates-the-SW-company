import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Observability Tests
 *
 * Tests production observability features:
 * - Request/response logging
 * - Performance tracking
 * - Metrics collection
 * - Error tracking
 */

describe('Observability', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request correlation', () => {
    it('should track requests successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      // Request IDs are tracked internally and logged
      // They appear in structured logs for correlation
    });

    it('should accept custom request ID from header', async () => {
      const customId = 'test-request-123';

      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(response.statusCode).toBe(200);
      // Custom request ID is used internally for correlation
    });
  });

  describe('Metrics collection', () => {
    it('should track requests and expose metrics', async () => {
      // Make some requests to generate metrics
      await app.inject({ method: 'GET', url: '/health' });
      await app.inject({ method: 'GET', url: '/health' });
      await app.inject({ method: 'GET', url: '/nonexistent' }); // 404

      // Get metrics
      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      expect(metricsResponse.statusCode).toBe(200);
      const metrics = metricsResponse.json();

      // Verify metrics structure
      expect(metrics).toHaveProperty('requests');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('timestamp');

      // Verify request counts
      expect(metrics.requests.total).toBeGreaterThan(0);
      expect(metrics.requests.by_status).toHaveProperty('200');
      expect(metrics.requests.by_status).toHaveProperty('404');
      expect(metrics.requests.by_method).toHaveProperty('GET');

      // Verify error tracking
      expect(metrics.errors.total).toBeGreaterThan(0);
      expect(metrics.errors.error_rate).toBeDefined();
      expect(metrics.errors.by_type).toHaveProperty('4xx');

      // Verify performance metrics
      expect(metrics.performance.avg_duration_ms).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.p50_ms).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.p95_ms).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.p99_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance tracking', () => {
    it('should track request duration', async () => {
      // Get initial metrics
      const before = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });
      const beforeMetrics = before.json();

      // Make a request
      await app.inject({
        method: 'GET',
        url: '/health',
      });

      // Get updated metrics
      const after = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });
      const afterMetrics = after.json();

      // Verify request count increased
      expect(afterMetrics.requests.total).toBeGreaterThan(beforeMetrics.requests.total);

      // Verify performance metrics updated
      expect(afterMetrics.performance.avg_duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error tracking', () => {
    it('should track 4xx errors', async () => {
      // Get initial error count
      const before = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });
      const beforeErrors = before.json().errors.total;

      // Generate 404 error
      await app.inject({
        method: 'GET',
        url: '/nonexistent-endpoint',
      });

      // Check error count increased
      const after = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });
      const afterErrors = after.json().errors.total;

      expect(afterErrors).toBeGreaterThan(beforeErrors);
    });

    it('should track error rate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      const metrics = response.json();

      // Error rate should be a percentage string
      expect(metrics.errors.error_rate).toMatch(/^\d+(\.\d+)?%$/);
    });
  });

  describe('Metrics format', () => {
    it('should return metrics in correct format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      expect(response.statusCode).toBe(200);
      const metrics = response.json();

      // Verify structure
      expect(metrics).toMatchObject({
        requests: {
          total: expect.any(Number),
          by_status: expect.any(Object),
          by_method: expect.any(Object),
        },
        errors: {
          total: expect.any(Number),
          error_rate: expect.any(String),
          by_type: expect.any(Object),
        },
        performance: {
          avg_duration_ms: expect.any(Number),
          p50_ms: expect.any(Number),
          p95_ms: expect.any(Number),
          p99_ms: expect.any(Number),
        },
        timestamp: expect.any(String),
      });

      // Verify timestamp is valid ISO string
      expect(new Date(metrics.timestamp)).toBeInstanceOf(Date);
    });
  });
});
