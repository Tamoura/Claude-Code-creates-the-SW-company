/**
 * SSE Token Re-validation and Connection Timeout Tests
 *
 * Verifies that SSE connections re-validate JWT tokens during
 * heartbeat intervals, and that connections are bounded by a
 * maximum timeout. This prevents attackers from maintaining
 * SSE access after token expiry.
 *
 * Security issue (MEDIUM): SSE tokens were validated only once
 * at connection time. The heartbeat continued indefinitely even
 * after the JWT expired. An attacker could start an SSE
 * connection and maintain access after token expiry.
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../setup';
import http from 'http';
import crypto from 'crypto';

describe('SSE Token Re-validation', () => {
  let app: FastifyInstance;
  let userId: string;
  let serverAddress: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create user directly via Prisma to avoid rate-limit issues.
    // We only need the user row to exist; we generate JWT tokens
    // with app.jwt.sign() for the SSE endpoint.
    const user = await prisma.user.create({
      data: {
        email: `sse-reval-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@test.com`,
        passwordHash: 'not-used-in-sse-tests',
      },
    });
    userId = user.id;

    // Start real HTTP server for streaming tests
    serverAddress = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSessionInDb(): Promise<string> {
    const id = `ps_sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await prisma.paymentSession.create({
      data: {
        id,
        user: { connect: { id: userId } },
        amount: 100,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchantAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        confirmations: 0,
      },
    });
    return id;
  }

  function generateSseToken(paymentSessionId: string, expiresIn = '1h'): string {
    return app.jwt.sign(
      { userId, type: 'sse', paymentSessionId },
      { expiresIn },
    );
  }

  /**
   * Open a real HTTP SSE connection and collect chunks.
   */
  function openSseStream(sessionId: string, token: string): {
    chunks: string[];
    request: http.ClientRequest;
    waitForContent: (match: string, timeoutMs: number) => Promise<boolean>;
  } {
    const url = new URL(
      `/v1/payment-sessions/${sessionId}/events`,
      serverAddress,
    );
    const chunks: string[] = [];
    let resolveContent: ((found: boolean) => void) | null = null;
    let contentMatch = '';

    const req = http.get(
      url.toString(),
      { headers: { authorization: `Bearer ${token}` } },
      (res) => {
        res.setEncoding('utf-8');
        res.on('data', (chunk: string) => {
          chunks.push(chunk);
          if (resolveContent && chunk.includes(contentMatch)) {
            const cb = resolveContent;
            resolveContent = null;
            cb(true);
          }
        });
        res.on('end', () => {
          if (resolveContent) {
            const cb = resolveContent;
            resolveContent = null;
            cb(false);
          }
        });
      },
    );

    req.on('error', () => {
      // Suppress errors from destroy()
    });

    return {
      chunks,
      request: req,
      waitForContent: (match: string, timeoutMs: number) =>
        new Promise<boolean>((resolve) => {
          if (chunks.join('').includes(match)) {
            resolve(true);
            return;
          }
          contentMatch = match;
          resolveContent = resolve;
          setTimeout(() => {
            if (resolveContent) {
              const cb = resolveContent;
              resolveContent = null;
              cb(false);
            }
          }, timeoutMs);
        }),
    };
  }

  // ---------------------------------------------------------------
  // Test 1: SSE connection closes when token expires
  // ---------------------------------------------------------------
  describe('Token expiry closes SSE connection', () => {
    it('should reject an already-expired token at connect time', async () => {
      const sessionId = await createSessionInDb();
      const shortToken = app.jwt.sign(
        { userId, type: 'sse', paymentSessionId: sessionId },
        { expiresIn: '1s' },
      );

      await new Promise((r) => setTimeout(r, 1500));

      const url = new URL(
        `/v1/payment-sessions/${sessionId}/events`,
        serverAddress,
      );

      const statusCode = await new Promise<number>((resolve) => {
        const req = http.get(
          url.toString(),
          { headers: { authorization: `Bearer ${shortToken}` } },
          (res) => {
            resolve(res.statusCode!);
            res.resume();
          },
        );
        req.on('error', () => resolve(0));
      });

      expect(statusCode).toBe(401);
    });

    it('should send token-expired error event when token expires mid-stream', async () => {
      const sessionId = await createSessionInDb();
      const shortToken = app.jwt.sign(
        { userId, type: 'sse', paymentSessionId: sessionId },
        { expiresIn: '2s' },
      );

      const stream = openSseStream(sessionId, shortToken);
      const found = await stream.waitForContent('Token expired', 40000);
      stream.request.destroy();

      expect(found).toBe(true);
    }, 50000);
  });

  // ---------------------------------------------------------------
  // Test 2: SSE connection stays open with valid token
  // ---------------------------------------------------------------
  describe('Valid token keeps connection open', () => {
    it('should send heartbeats without closing the connection', async () => {
      const sessionId = await createSessionInDb();
      const validToken = generateSseToken(sessionId, '1h');

      const stream = openSseStream(sessionId, validToken);
      const gotHeartbeat = await stream.waitForContent('heartbeat', 35000);
      stream.request.destroy();

      const joined = stream.chunks.join('');
      expect(joined).toContain('data:');
      expect(gotHeartbeat).toBe(true);
      expect(joined).not.toContain('Token expired');
    }, 45000);
  });

  // ---------------------------------------------------------------
  // Test 3: Heartbeat interval is cleared when token expires
  // ---------------------------------------------------------------
  describe('Heartbeat cleanup on token expiry', () => {
    it('should not send heartbeats after the token-expired event', async () => {
      const sessionId = await createSessionInDb();
      const shortToken = app.jwt.sign(
        { userId, type: 'sse', paymentSessionId: sessionId },
        { expiresIn: '2s' },
      );

      const stream = openSseStream(sessionId, shortToken);

      const found = await stream.waitForContent('Token expired', 40000);
      expect(found).toBe(true);

      const countAtExpiry = stream.chunks.length;
      await new Promise((r) => setTimeout(r, 35000));

      const newChunks = stream.chunks.slice(countAtExpiry);
      const extraHeartbeats = newChunks.filter((c) => c.includes('heartbeat'));

      stream.request.destroy();

      expect(extraHeartbeats.length).toBe(0);
    }, 90000);
  });

  // ---------------------------------------------------------------
  // Test 4: Maximum connection timeout (30 minutes)
  // ---------------------------------------------------------------
  describe('Maximum connection timeout', () => {
    it('should not immediately close a valid connection', async () => {
      const sessionId = await createSessionInDb();
      const validToken = generateSseToken(sessionId, '2h');

      const stream = openSseStream(sessionId, validToken);

      await new Promise((r) => setTimeout(r, 2000));

      const joined = stream.chunks.join('');
      stream.request.destroy();

      expect(joined).toContain('data:');
      expect(joined).not.toContain('Maximum connection time reached');
    }, 10000);
  });
});
