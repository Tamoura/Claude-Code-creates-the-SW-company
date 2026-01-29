/**
 * Payment Session Expiry Enforcement Tests
 *
 * Verifies that expired payment sessions cannot be updated to
 * CONFIRMING or COMPLETED status. When an expired session is
 * detected during a status update, it should be auto-set to
 * FAILED and the request rejected with a 400 error.
 *
 * Backward compatibility: sessions with a far-future expiresAt
 * should still be updatable without interference.
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../setup';

describe('Payment Session Expiry Enforcement', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let userId: string;

  const TEST_EMAIL = `expiry-enforce-${Date.now()}@example.com`;
  const TEST_PASSWORD = 'SecurePass123!';

  beforeAll(async () => {
    app = await buildApp();

    // Try signup first; fall back to login if user exists
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    if (signupResponse.statusCode === 201) {
      const body = signupResponse.json();
      accessToken = body.access_token;
      userId = body.id;
    } else {
      // User may already exist or rate-limited; try login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      const body = loginResponse.json();
      accessToken = body.access_token;
      userId = body.id;
    }

    // If still no userId (rate limited on both), create user directly
    if (!userId) {
      const user = await prisma.user.create({
        data: {
          email: `expiry-direct-${Date.now()}@example.com`,
          passwordHash: 'test-hash-not-for-login',
        },
      });
      userId = user.id;

      // Generate a JWT token for this user
      const loginResp = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: `expiry-direct2-${Date.now()}@example.com`,
          password: TEST_PASSWORD,
        },
      });
      if (loginResp.statusCode === 201) {
        const body = loginResp.json();
        accessToken = body.access_token;
        userId = body.id;
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Helper: create a payment session via raw SQL to avoid Prisma
   * relation requirements and rate-limit issues.
   */
  async function createSessionInDb(
    opts: { expired?: boolean; farFuture?: boolean; status?: string } = {}
  ): Promise<string> {
    const id = `ps_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    // Use 7 days from now by default (matching the app default)
    let expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    if (opts.expired) {
      // Set to 2 days ago to clearly be expired regardless of timezone
      expiresAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    }
    if (opts.farFuture) {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }

    const status = opts.status || 'PENDING';

    // Use Prisma to create the session (Prisma handles timezone correctly)
    await prisma.paymentSession.create({
      data: {
        id,
        user: { connect: { id: userId } },
        amount: 50,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchantAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        status: status as any,
        expiresAt,
        confirmations: 0,
      },
    });

    return id;
  }

  describe('Non-expired sessions', () => {
    it('should allow updating a non-expired session status', async () => {
      const id = await createSessionInDb();

      // PENDING -> FAILED is valid and does not require blockchain
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { status: 'FAILED' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('FAILED');
    });

    it('should not reject non-expired session with session-expired error', async () => {
      const id = await createSessionInDb();

      // Attempt PENDING -> CONFIRMING (will fail due to blockchain
      // verification but should NOT fail due to expiry)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          status: 'CONFIRMING',
          tx_hash: '0x' + 'a'.repeat(64),
        },
      });

      const body = response.json();
      // May fail for blockchain reasons, but NOT for expiry
      if (response.statusCode !== 200) {
        expect(body.type).not.toContain('session-expired');
      }
    });
  });

  describe('Expired sessions', () => {
    it('should reject updating an expired session to CONFIRMING with 400', async () => {
      const id = await createSessionInDb({ expired: true });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          status: 'CONFIRMING',
          tx_hash: '0x' + 'c'.repeat(64),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.type).toContain('session-expired');
    });

    it('should reject updating an expired session to COMPLETED with 400', async () => {
      // Start in CONFIRMING so the CONFIRMING->COMPLETED transition is valid
      const id = await createSessionInDb({ expired: true, status: 'CONFIRMING' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          status: 'COMPLETED',
          tx_hash: '0x' + 'd'.repeat(64),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.type).toContain('session-expired');
    });

    it('should auto-set expired session status to FAILED in the database', async () => {
      const id = await createSessionInDb({ expired: true });

      // Attempt to update -- should be rejected
      await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          status: 'CONFIRMING',
          tx_hash: '0x' + 'e'.repeat(64),
        },
      });

      // Verify the session was auto-set to FAILED in the database
      const session = await prisma.paymentSession.findUnique({
        where: { id },
      });
      expect(session).not.toBeNull();
      expect(session!.status).toBe('FAILED');
    });

    it('should return a clear error message indicating expiry', async () => {
      const id = await createSessionInDb({ expired: true });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          status: 'CONFIRMING',
          tx_hash: '0x' + 'f'.repeat(64),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toMatch(/expired/i);
    });

    it('should still allow transitioning an expired session to FAILED', async () => {
      const id = await createSessionInDb({ expired: true });

      // Setting to FAILED is allowed because that is the desired
      // terminal state for expired sessions
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { status: 'FAILED' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('FAILED');
    });
  });

  describe('Backward compatibility', () => {
    it('should allow updates when expiresAt is far in the future', async () => {
      const id = await createSessionInDb({ farFuture: true });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { status: 'FAILED' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('FAILED');
    });

    it('should not interfere with non-status field updates on expired sessions', async () => {
      const id = await createSessionInDb({ expired: true });

      // Updating non-status fields on an expired session should work
      // because the expiry check only blocks CONFIRMING/COMPLETED
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          customer_address: '0x1234567890123456789012345678901234567890',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().customer_address).toBe(
        '0x1234567890123456789012345678901234567890'
      );
    });
  });
});
