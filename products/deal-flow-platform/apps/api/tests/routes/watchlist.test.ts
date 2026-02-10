import { FastifyInstance } from 'fastify';
import {
  createTestApp,
  setupTestData,
  createTestUser,
  createTestInvestorProfile,
  createTestIssuerProfile,
  loginUser,
} from '../helpers/test-utils';
import { prisma } from '../setup';

describe('Watchlist Routes', () => {
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

  async function createInvestorWithDeal() {
    const investor = await createTestUser({
      tenantId,
      email: 'investor@test.qa',
      password: 'SecurePass123!',
      role: 'INVESTOR',
    });
    await createTestInvestorProfile(investor.id);
    const tokens = await loginUser(app, 'investor@test.qa', 'SecurePass123!');

    const issuer = await createTestUser({
      tenantId,
      email: 'issuer@test.qa',
      password: 'SecurePass123!',
      role: 'ISSUER',
    });
    const issuerProfile = await createTestIssuerProfile(issuer.id);

    const deal = await prisma.deal.create({
      data: {
        tenantId,
        issuerId: issuerProfile.id,
        titleEn: 'Test Sukuk',
        dealType: 'SUKUK',
        status: 'ACTIVE',
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        eligibleClassifications: ['RETAIL'],
      },
    });

    return { investor, deal, accessToken: tokens.data.accessToken };
  }

  describe('POST /api/v1/watchlist', () => {
    it('adds a deal to watchlist', async () => {
      const { deal, accessToken } = await createInvestorWithDeal();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { dealId: deal.id },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data.dealId).toBe(deal.id);
    });

    it('returns 409 for duplicate watchlist item', async () => {
      const { deal, accessToken } = await createInvestorWithDeal();

      await app.inject({
        method: 'POST',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { dealId: deal.id },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { dealId: deal.id },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 404 for non-existent deal', async () => {
      const investor = await createTestUser({
        tenantId,
        email: 'inv2@test.qa',
        password: 'SecurePass123!',
        role: 'INVESTOR',
      });
      await createTestInvestorProfile(investor.id);
      const tokens = await loginUser(app, 'inv2@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${tokens.data.accessToken}` },
        payload: { dealId: 'non-existent-id' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/watchlist', () => {
    it('lists watchlisted deals', async () => {
      const { deal, accessToken } = await createInvestorWithDeal();

      await app.inject({
        method: 'POST',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { dealId: deal.id },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].deal.titleEn).toBe('Test Sukuk');
    });
  });

  describe('DELETE /api/v1/watchlist/:dealId', () => {
    it('removes a deal from watchlist', async () => {
      const { deal, accessToken } = await createInvestorWithDeal();

      await app.inject({
        method: 'POST',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { dealId: deal.id },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/watchlist/${deal.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);

      // Verify it's gone
      const list = await app.inject({
        method: 'GET',
        url: '/api/v1/watchlist',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(list.json().data.length).toBe(0);
    });

    it('returns 404 for non-watchlisted deal', async () => {
      const investor = await createTestUser({
        tenantId,
        email: 'inv3@test.qa',
        password: 'SecurePass123!',
        role: 'INVESTOR',
      });
      await createTestInvestorProfile(investor.id);
      const tokens = await loginUser(app, 'inv3@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/watchlist/some-deal-id',
        headers: { authorization: `Bearer ${tokens.data.accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
