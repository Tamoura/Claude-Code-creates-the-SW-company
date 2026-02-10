import { FastifyInstance } from 'fastify';
import {
  createTestApp,
  setupTestData,
  createTestUser,
  createTestIssuerProfile,
  loginUser,
  cleanDatabase,
} from '../helpers/test-utils';
import { prisma } from '../setup';

describe('Deal Routes', () => {
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

  async function createIssuerWithToken() {
    const user = await createTestUser({
      tenantId,
      email: 'issuer@test.qa',
      password: 'SecurePass123!',
      role: 'ISSUER',
    });
    await createTestIssuerProfile(user.id);
    const tokens = await loginUser(app, 'issuer@test.qa', 'SecurePass123!');
    return { user, accessToken: tokens.data.accessToken };
  }

  async function createDealAsIssuer(token: string, overrides = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/deals',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        titleEn: 'Qatar Tech IPO',
        descriptionEn: 'Initial public offering for Qatar Tech Ltd',
        dealType: 'IPO',
        targetRaise: 50000000,
        minInvestment: 10000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'TECHNOLOGY',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
        ...overrides,
      },
    });
  }

  describe('POST /api/v1/deals', () => {
    it('creates a deal as issuer', async () => {
      const { accessToken } = await createIssuerWithToken();

      const response = await createDealAsIssuer(accessToken);

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toHaveProperty('id');
      expect(body.data.titleEn).toBe('Qatar Tech IPO');
      expect(body.data.status).toBe('DRAFT');
      expect(body.data.dealType).toBe('IPO');
    });

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deals',
        payload: { titleEn: 'Test', dealType: 'IPO' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-issuer role', async () => {
      const user = await createTestUser({
        tenantId,
        email: 'investor@test.qa',
        password: 'SecurePass123!',
        role: 'INVESTOR',
      });
      const tokens = await loginUser(app, 'investor@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deals',
        headers: { authorization: `Bearer ${tokens.data.accessToken}` },
        payload: { titleEn: 'Test', dealType: 'IPO' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/deals', () => {
    it('lists deals with pagination', async () => {
      const { accessToken } = await createIssuerWithToken();
      await createDealAsIssuer(accessToken, { titleEn: 'Deal 1' });
      await createDealAsIssuer(accessToken, { titleEn: 'Deal 2' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deals',
        headers: { 'x-tenant-id': tenantId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(2);
      expect(body.meta).toHaveProperty('total');
    });

    it('filters deals by dealType', async () => {
      const { accessToken } = await createIssuerWithToken();
      await createDealAsIssuer(accessToken, {
        titleEn: 'IPO Deal',
        dealType: 'IPO',
      });
      await createDealAsIssuer(accessToken, {
        titleEn: 'Sukuk Deal',
        dealType: 'SUKUK',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deals?dealType=SUKUK',
        headers: { 'x-tenant-id': tenantId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].dealType).toBe('SUKUK');
    });

    it('filters deals by shariaCompliance', async () => {
      const { accessToken } = await createIssuerWithToken();
      await createDealAsIssuer(accessToken, {
        titleEn: 'Sharia Deal',
        shariaCompliance: 'CERTIFIED',
      });
      await createDealAsIssuer(accessToken, {
        titleEn: 'Non-Sharia Deal',
        shariaCompliance: 'NON_CERTIFIED',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deals?shariaCompliance=CERTIFIED',
        headers: { 'x-tenant-id': tenantId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBe(1);
    });

    it('supports search by title', async () => {
      const { accessToken } = await createIssuerWithToken();
      await createDealAsIssuer(accessToken, { titleEn: 'QIIB Sukuk' });
      await createDealAsIssuer(accessToken, { titleEn: 'Qatar Tech IPO' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deals?search=QIIB',
        headers: { 'x-tenant-id': tenantId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].titleEn).toContain('QIIB');
    });

    it('supports cursor-based pagination', async () => {
      const { accessToken } = await createIssuerWithToken();
      await createDealAsIssuer(accessToken, { titleEn: 'Deal A' });
      await createDealAsIssuer(accessToken, { titleEn: 'Deal B' });
      await createDealAsIssuer(accessToken, { titleEn: 'Deal C' });

      const first = await app.inject({
        method: 'GET',
        url: '/api/v1/deals?limit=2',
        headers: { 'x-tenant-id': tenantId },
      });

      expect(first.statusCode).toBe(200);
      const firstBody = first.json();
      expect(firstBody.data.length).toBe(2);
      expect(firstBody.meta).toHaveProperty('nextCursor');

      const second = await app.inject({
        method: 'GET',
        url: `/api/v1/deals?limit=2&cursor=${firstBody.meta.nextCursor}`,
        headers: { 'x-tenant-id': tenantId },
      });

      expect(second.statusCode).toBe(200);
      const secondBody = second.json();
      expect(secondBody.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/deals/:id', () => {
    it('returns deal detail with documents', async () => {
      const { accessToken } = await createIssuerWithToken();
      const createRes = await createDealAsIssuer(accessToken);
      const dealId = createRes.json().data.id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/deals/${dealId}`,
        headers: { 'x-tenant-id': tenantId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.id).toBe(dealId);
      expect(body.data).toHaveProperty('documents');
    });

    it('returns 404 for non-existent deal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deals/non-existent-id',
        headers: { 'x-tenant-id': tenantId },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/deals/:id', () => {
    it('updates deal by owner issuer', async () => {
      const { accessToken } = await createIssuerWithToken();
      const createRes = await createDealAsIssuer(accessToken);
      const dealId = createRes.json().data.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/deals/${dealId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { titleEn: 'Updated Title' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.titleEn).toBe('Updated Title');
    });

    it('returns 403 for non-owner issuer', async () => {
      const { accessToken: ownerToken } = await createIssuerWithToken();
      const createRes = await createDealAsIssuer(ownerToken);
      const dealId = createRes.json().data.id;

      // Create a different issuer
      const otherUser = await createTestUser({
        tenantId,
        email: 'other-issuer@test.qa',
        password: 'SecurePass123!',
        role: 'ISSUER',
      });
      await createTestIssuerProfile(otherUser.id);
      const otherTokens = await loginUser(
        app,
        'other-issuer@test.qa',
        'SecurePass123!'
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/deals/${dealId}`,
        headers: { authorization: `Bearer ${otherTokens.data.accessToken}` },
        payload: { titleEn: 'Hijacked' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/v1/deals/:id/status', () => {
    it('transitions deal status', async () => {
      const { accessToken } = await createIssuerWithToken();
      const createRes = await createDealAsIssuer(accessToken);
      const dealId = createRes.json().data.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/deals/${dealId}/status`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { status: 'UNDER_REVIEW' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.status).toBe('UNDER_REVIEW');
    });

    it('rejects invalid status transitions', async () => {
      const { accessToken } = await createIssuerWithToken();
      const createRes = await createDealAsIssuer(accessToken);
      const dealId = createRes.json().data.id;

      // DRAFT cannot jump to SETTLED
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/deals/${dealId}/status`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { status: 'SETTLED' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
