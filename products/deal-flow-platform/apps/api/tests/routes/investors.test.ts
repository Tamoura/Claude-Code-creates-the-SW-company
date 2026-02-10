import { FastifyInstance } from 'fastify';
import {
  createTestApp,
  setupTestData,
  createTestUser,
  createTestInvestorProfile,
  loginUser,
} from '../helpers/test-utils';

describe('Investor Routes', () => {
  let app: FastifyInstance;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    const data = await setupTestData();
    tenantId = data.tenant.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createInvestorWithToken() {
    const user = await createTestUser({
      tenantId,
      email: 'investor@test.qa',
      password: 'SecurePass123!',
      role: 'INVESTOR',
      fullNameEn: 'Ahmed Al-Thani',
    });
    await createTestInvestorProfile(user.id);
    const tokens = await loginUser(app, 'investor@test.qa', 'SecurePass123!');
    return { user, accessToken: tokens.data.accessToken };
  }

  describe('GET /api/v1/investors/profile', () => {
    it('returns investor profile', async () => {
      const { accessToken } = await createInvestorWithToken();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/investors/profile',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveProperty('classification');
      expect(body.data.classification).toBe('RETAIL');
      expect(body.data.user.email).toBe('investor@test.qa');
    });

    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/investors/profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-investor role', async () => {
      const user = await createTestUser({
        tenantId,
        email: 'issuer@test.qa',
        password: 'SecurePass123!',
        role: 'ISSUER',
      });
      const tokens = await loginUser(app, 'issuer@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/investors/profile',
        headers: { authorization: `Bearer ${tokens.data.accessToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PUT /api/v1/investors/profile', () => {
    it('updates investor profile', async () => {
      const { accessToken } = await createInvestorWithToken();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/investors/profile',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          shariaPreference: false,
          riskTolerance: 'HIGH',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.shariaPreference).toBe(false);
      expect(body.data.riskTolerance).toBe('HIGH');
    });
  });

  describe('GET /api/v1/investors/portfolio', () => {
    it('returns empty portfolio for new investor', async () => {
      const { accessToken } = await createInvestorWithToken();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/investors/portfolio',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.items).toEqual([]);
      expect(body.data.totalValue).toBe(0);
      expect(body.data.currency).toBe('QAR');
    });
  });
});
