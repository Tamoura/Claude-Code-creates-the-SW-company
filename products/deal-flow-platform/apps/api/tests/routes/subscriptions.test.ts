import { FastifyInstance } from 'fastify';
import {
  createTestApp,
  setupTestData,
  createTestUser,
  createTestIssuerProfile,
  createTestInvestorProfile,
  loginUser,
  cleanDatabase,
} from '../helpers/test-utils';
import { prisma } from '../setup';

describe('Subscription Routes', () => {
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

  async function createDealAndInvestor() {
    // Create issuer + deal
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
        titleEn: 'Qatar Sukuk Fund',
        dealType: 'SUKUK',
        status: 'SUBSCRIPTION_OPEN',
        minInvestment: 5000,
        maxInvestment: 500000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
      },
    });

    // Create investor
    const investor = await createTestUser({
      tenantId,
      email: 'investor@test.qa',
      password: 'SecurePass123!',
      role: 'INVESTOR',
    });
    const investorProfile = await createTestInvestorProfile(investor.id);
    const tokens = await loginUser(app, 'investor@test.qa', 'SecurePass123!');

    return {
      deal,
      investor,
      investorProfile,
      accessToken: tokens.data.accessToken,
    };
  }

  describe('POST /api/v1/subscriptions', () => {
    it('creates a subscription intent', async () => {
      const { deal, accessToken } = await createDealAndInvestor();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          dealId: deal.id,
          amount: 50000,
          currency: 'QAR',
          acceptedTerms: true,
          acceptedRisks: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toHaveProperty('id');
      expect(body.data.status).toBe('INTENT_EXPRESSED');
      expect(body.data.dealId).toBe(deal.id);
    });

    it('rejects subscription below minimum investment', async () => {
      const { deal, accessToken } = await createDealAndInvestor();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          dealId: deal.id,
          amount: 100,
          currency: 'QAR',
          acceptedTerms: true,
          acceptedRisks: true,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects subscription when deal is not open', async () => {
      const issuer = await createTestUser({
        tenantId,
        email: 'issuer2@test.qa',
        password: 'SecurePass123!',
        role: 'ISSUER',
      });
      const issuerProfile = await createTestIssuerProfile(issuer.id);
      const closedDeal = await prisma.deal.create({
        data: {
          tenantId,
          issuerId: issuerProfile.id,
          titleEn: 'Closed Deal',
          dealType: 'IPO',
          status: 'DRAFT',
          currency: 'QAR',
          shariaCompliance: 'PENDING',
          eligibleClassifications: ['RETAIL'],
        },
      });

      const investor = await createTestUser({
        tenantId,
        email: 'investor2@test.qa',
        password: 'SecurePass123!',
        role: 'INVESTOR',
      });
      await createTestInvestorProfile(investor.id);
      const tokens = await loginUser(app, 'investor2@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${tokens.data.accessToken}` },
        payload: {
          dealId: closedDeal.id,
          amount: 10000,
          currency: 'QAR',
          acceptedTerms: true,
          acceptedRisks: true,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects ineligible investor classification', async () => {
      const issuer = await createTestUser({
        tenantId,
        email: 'issuer3@test.qa',
        password: 'SecurePass123!',
        role: 'ISSUER',
      });
      const issuerProfile = await createTestIssuerProfile(issuer.id);
      const proOnlyDeal = await prisma.deal.create({
        data: {
          tenantId,
          issuerId: issuerProfile.id,
          titleEn: 'Pro Only Deal',
          dealType: 'PE_VC',
          status: 'SUBSCRIPTION_OPEN',
          minInvestment: 100000,
          currency: 'QAR',
          shariaCompliance: 'CERTIFIED',
          eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        },
      });

      // Investor is RETAIL classification
      const investor = await createTestUser({
        tenantId,
        email: 'retail@test.qa',
        password: 'SecurePass123!',
        role: 'INVESTOR',
      });
      await createTestInvestorProfile(investor.id); // defaults to RETAIL
      const tokens = await loginUser(app, 'retail@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${tokens.data.accessToken}` },
        payload: {
          dealId: proOnlyDeal.id,
          amount: 100000,
          currency: 'QAR',
          acceptedTerms: true,
          acceptedRisks: true,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        payload: { dealId: 'some-id', amount: 10000 },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/subscriptions', () => {
    it('lists subscriptions for current user', async () => {
      const { deal, accessToken } = await createDealAndInvestor();

      await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          dealId: deal.id,
          amount: 50000,
          currency: 'QAR',
          acceptedTerms: true,
          acceptedRisks: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/subscriptions/:id', () => {
    it('returns subscription detail', async () => {
      const { deal, accessToken } = await createDealAndInvestor();

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/subscriptions',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          dealId: deal.id,
          amount: 50000,
          currency: 'QAR',
          acceptedTerms: true,
          acceptedRisks: true,
        },
      });
      const subId = createRes.json().data.id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/subscriptions/${subId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.id).toBe(subId);
    });
  });
});
