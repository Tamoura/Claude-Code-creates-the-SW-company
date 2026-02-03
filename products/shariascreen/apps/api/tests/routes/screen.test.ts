import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helpers/test-app';

describe('Screen Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBe('0.1.0');
    });
  });

  describe('GET /api/v1/screen/:ticker', () => {
    it('should return compliance data for AAPL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/screen/AAPL',
        headers: {
          authorization: 'Bearer test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ticker).toBe('AAPL');
      expect(body.name).toBe('Apple Inc.');
      expect(body.status).toBe('COMPLIANT');
      expect(body.standard).toBe('AAOIFI');
      expect(body.ratios).toBeDefined();
      expect(body.ratios.debtRatio).toBeDefined();
      expect(body.ratios.interestIncomeRatio).toBeDefined();
      expect(body.ratios.cashRatio).toBeDefined();
      expect(body.ratios.receivablesRatio).toBeDefined();
      expect(body.businessActivity).toBeDefined();
      expect(body.purification).toBeDefined();
      expect(body.screenedAt).toBeDefined();
    });

    it('should return 404 for invalid ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/screen/INVALID',
        headers: {
          authorization: 'Bearer test-api-key',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/screen/AAPL',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should be case-insensitive for ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/screen/aapl',
        headers: {
          authorization: 'Bearer test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ticker).toBe('AAPL');
    });

    it('should return NON_COMPLIANT for JPM', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/screen/JPM',
        headers: {
          authorization: 'Bearer test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('NON_COMPLIANT');
    });
  });

  describe('POST /api/v1/screen/batch', () => {
    it('should return batch results for multiple tickers', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/screen/batch',
        headers: {
          authorization: 'Bearer test-api-key',
          'content-type': 'application/json',
        },
        payload: {
          tickers: ['AAPL', 'MSFT', 'JPM'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toHaveLength(3);
      expect(body.meta.total).toBe(3);
      expect(body.meta.compliant).toBeGreaterThanOrEqual(1);
      expect(body.meta.nonCompliant).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing tickers gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/screen/batch',
        headers: {
          authorization: 'Bearer test-api-key',
          'content-type': 'application/json',
        },
        payload: {
          tickers: ['AAPL', 'NONEXISTENT'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toHaveLength(1);
      expect(body.warnings).toBeDefined();
      expect(body.warnings.notFound).toContain('NONEXISTENT');
    });

    it('should return 400 for empty tickers array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/screen/batch',
        headers: {
          authorization: 'Bearer test-api-key',
          'content-type': 'application/json',
        },
        payload: {
          tickers: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/screen/batch',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          tickers: ['AAPL'],
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/report/:ticker', () => {
    it('should return detailed report with explanation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/report/AAPL',
        headers: {
          authorization: 'Bearer test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ticker).toBe('AAPL');
      expect(body.explanation).toBeDefined();
      expect(body.explanation.length).toBeGreaterThan(50);
      expect(body.explanation).toContain('Debt');
      expect(body.explanation).toContain('Interest');
      expect(body.ratios).toBeDefined();
      expect(body.businessActivity).toBeDefined();
      expect(body.purification).toBeDefined();
    });

    it('should return 404 for unknown ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/report/ZZZZZ',
        headers: {
          authorization: 'Bearer test-api-key',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
