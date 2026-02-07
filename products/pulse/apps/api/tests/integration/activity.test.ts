/**
 * Activity module integration tests.
 * Tests WebSocket streaming and REST activity feed.
 *
 * WebSocket tests use a real HTTP server (app.listen) since
 * WebSocket upgrades require a real TCP connection.
 */
import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { buildApp } from '../../src/app.js';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/pulse_test';
delete process.env.REDIS_URL;

// Helper: register a user and get a JWT token
async function registerAndGetToken(
  app: FastifyInstance,
  email = 'ws-test@pulse.dev'
): Promise<{ token: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: 'SecureP@ss123', name: 'WS Test' },
  });
  const body = JSON.parse(res.payload);
  return { token: body.token, userId: body.user.id };
}

// Helper: create a team in the DB directly
async function createTeam(
  app: FastifyInstance,
  userId: string,
  slug = 'test-team'
): Promise<string> {
  const team = await app.prisma.team.create({
    data: { name: 'Test Team', slug },
  });
  await app.prisma.teamMember.create({
    data: { userId, teamId: team.id, role: 'MEMBER' },
  });
  return team.id;
}

// Helper: create a repo in the DB directly
async function createRepo(
  app: FastifyInstance,
  teamId: string
): Promise<string> {
  const repo = await app.prisma.repository.create({
    data: {
      teamId,
      githubId: BigInt(Math.floor(Math.random() * 1000000)),
      name: 'test-repo',
      fullName: 'org/test-repo',
    },
  });
  return repo.id;
}

/**
 * Helper: open a WS connection and collect messages.
 * Sets up a message buffer BEFORE the connection opens
 * so no messages are lost to race conditions.
 */
function openWs(
  address: string,
  token?: string
): Promise<{
  ws: WebSocket;
  waitForMessage: (
    type: string,
    timeoutMs?: number
  ) => Promise<Record<string, unknown>>;
}> {
  const url = token
    ? `${address}/api/v1/activity/stream?token=${token}`
    : `${address}/api/v1/activity/stream`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messageBuffer: Record<string, unknown>[] = [];
    const pendingWaiters: Array<{
      type: string;
      resolve: (msg: Record<string, unknown>) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }> = [];

    // Collect ALL messages from the start
    ws.on('message', (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString());
      messageBuffer.push(msg);

      // Check if any waiter matches
      const idx = pendingWaiters.findIndex((w) => w.type === msg.type);
      if (idx !== -1) {
        const waiter = pendingWaiters[idx];
        clearTimeout(waiter.timer);
        pendingWaiters.splice(idx, 1);
        waiter.resolve(msg);
      }
    });

    function waitForMessage(
      type: string,
      timeoutMs = 5000
    ): Promise<Record<string, unknown>> {
      // First check buffered messages
      const idx = messageBuffer.findIndex((m) => m.type === type);
      if (idx !== -1) {
        const msg = messageBuffer[idx];
        messageBuffer.splice(idx, 1);
        return Promise.resolve(msg);
      }

      // Otherwise wait for it
      return new Promise((res, rej) => {
        const timer = setTimeout(
          () => {
            const wIdx = pendingWaiters.findIndex((w) => w.type === type);
            if (wIdx !== -1) pendingWaiters.splice(wIdx, 1);
            rej(new Error(`Timeout waiting for ${type}`));
          },
          timeoutMs
        );
        pendingWaiters.push({ type, resolve: res, reject: rej, timer });
      });
    }

    ws.on('open', () => resolve({ ws, waitForMessage }));
    ws.on('error', reject);
  });
}

// Helper: clean the database
async function cleanDatabase(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.riskSnapshot.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.coverageReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

describe('Activity Module', () => {
  let app: FastifyInstance;
  let address: string;

  beforeAll(async () => {
    app = await buildApp();
    const addr = await app.listen({ port: 0, host: '127.0.0.1' });
    address = addr.replace('http', 'ws');
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  // ── REST Endpoint Tests ──────────────────────────────

  describe('GET /api/v1/activity', () => {
    it('should return 401 without auth token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/activity',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return empty paginated response when no activity', async () => {
      const { token } = await registerAndGetToken(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/activity',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items).toEqual([]);
      expect(body.cursor).toBeNull();
      expect(body.hasMore).toBe(false);
    });

    it('should return activity filtered by teamId', async () => {
      const { token, userId } = await registerAndGetToken(app);
      const teamId = await createTeam(app, userId);
      const repoId = await createRepo(app, teamId);

      await app.prisma.commit.create({
        data: {
          repoId,
          sha: 'abc123',
          message: 'test commit',
          authorGithubUsername: 'dev1',
          committedAt: new Date(),
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/activity?teamId=${teamId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items.length).toBeGreaterThanOrEqual(1);
      expect(body.items[0].type).toBe('commit');
    });

    it('should support cursor-based pagination', async () => {
      const { token, userId } = await registerAndGetToken(app);
      const teamId = await createTeam(app, userId);
      const repoId = await createRepo(app, teamId);

      // Seed 5 commits with distinct timestamps
      for (let i = 0; i < 5; i++) {
        await app.prisma.commit.create({
          data: {
            repoId,
            sha: `sha-${i}`,
            message: `commit ${i}`,
            authorGithubUsername: 'dev1',
            committedAt: new Date(Date.now() - i * 60000),
          },
        });
      }

      // First page: limit=2, eventType=commit to avoid
      // mixing with other entity types
      const res1 = await app.inject({
        method: 'GET',
        url: `/api/v1/activity?teamId=${teamId}&limit=2&eventType=commit`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res1.statusCode).toBe(200);
      const body1 = JSON.parse(res1.payload);
      expect(body1.items.length).toBe(2);
      expect(body1.hasMore).toBe(true);
      expect(body1.cursor).toBeDefined();

      // Second page
      const res2 = await app.inject({
        method: 'GET',
        url: `/api/v1/activity?teamId=${teamId}&limit=2&eventType=commit&cursor=${body1.cursor}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.payload);
      expect(body2.items.length).toBe(2);
      expect(body2.items[0].summary).not.toBe(body1.items[0].summary);
    });
  });

  // ── WebSocket Tests ──────────────────────────────────

  describe('WebSocket /api/v1/activity/stream', () => {
    it('should authenticate via query param token', async () => {
      const { token } = await registerAndGetToken(app, 'ws-auth@pulse.dev');
      const { ws, waitForMessage } = await openWs(address, token);

      try {
        const msg = await waitForMessage('authenticated');
        expect(msg.type).toBe('authenticated');
        expect(msg.userId).toBeDefined();
      } finally {
        ws.close();
      }
    });

    it('should authenticate via first message', async () => {
      const { token } = await registerAndGetToken(app, 'ws-msg@pulse.dev');
      const { ws, waitForMessage } = await openWs(address);

      try {
        ws.send(JSON.stringify({ type: 'auth', token }));
        const msg = await waitForMessage('authenticated');
        expect(msg.type).toBe('authenticated');
        expect(msg.userId).toBeDefined();
      } finally {
        ws.close();
      }
    });

    it('should close connection for invalid token', async () => {
      const { ws } = await openWs(address, 'invalid-token');

      const closePromise = new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
      });

      const code = await closePromise;
      expect(code).toBe(4001);
    });

    it('should subscribe to a room and confirm', async () => {
      const { token, userId } = await registerAndGetToken(
        app,
        'ws-sub@pulse.dev'
      );
      const teamId = await createTeam(app, userId, 'sub-team');
      const { ws, waitForMessage } = await openWs(address, token);

      try {
        await waitForMessage('authenticated');
        ws.send(JSON.stringify({ type: 'subscribe', room: `team:${teamId}` }));
        const msg = await waitForMessage('subscribed');
        expect(msg.room).toBe(`team:${teamId}`);
      } finally {
        ws.close();
      }
    });

    it('should handle pong and keep connection alive', async () => {
      const { token } = await registerAndGetToken(app, 'ws-pong@pulse.dev');
      const { ws, waitForMessage } = await openWs(address, token);

      try {
        await waitForMessage('authenticated');
        ws.send(JSON.stringify({ type: 'pong' }));
        // Connection should still be open after pong
        expect(ws.readyState).toBe(WebSocket.OPEN);
      } finally {
        ws.close();
      }
    });

    it('should unsubscribe from a room', async () => {
      const { token, userId } = await registerAndGetToken(
        app,
        'ws-unsub@pulse.dev'
      );
      const teamId = await createTeam(app, userId, 'unsub-team');
      const { ws, waitForMessage } = await openWs(address, token);

      try {
        await waitForMessage('authenticated');

        ws.send(JSON.stringify({ type: 'subscribe', room: `team:${teamId}` }));
        await waitForMessage('subscribed');

        ws.send(
          JSON.stringify({ type: 'unsubscribe', room: `team:${teamId}` })
        );
        const msg = await waitForMessage('unsubscribed');
        expect(msg.room).toBe(`team:${teamId}`);
      } finally {
        ws.close();
      }
    });

    it('should send error for invalid message format', async () => {
      const { token } = await registerAndGetToken(
        app,
        'ws-err@pulse.dev'
      );
      const { ws, waitForMessage } = await openWs(address, token);

      try {
        await waitForMessage('authenticated');
        ws.send(JSON.stringify({ type: 'invalid', data: 'bad' }));
        const msg = await waitForMessage('error');
        expect(msg.type).toBe('error');
        expect(msg.message).toBeDefined();
      } finally {
        ws.close();
      }
    });

    it('should broadcast events to subscribed clients only', async () => {
      const { token: token1, userId: userId1 } = await registerAndGetToken(
        app,
        'ws-bc1@pulse.dev'
      );
      const teamId = await createTeam(app, userId1, 'bc-team');
      const { ws: ws1, waitForMessage: wait1 } = await openWs(address, token1);

      const { token: token2 } = await registerAndGetToken(
        app,
        'ws-bc2@pulse.dev'
      );
      const { ws: ws2, waitForMessage: wait2 } = await openWs(address, token2);

      try {
        await wait1('authenticated');
        await wait2('authenticated');

        // Subscribe ws1 to team room
        ws1.send(JSON.stringify({ type: 'subscribe', room: `team:${teamId}` }));
        await wait1('subscribed');

        // Publish an event via the event publisher
        const { EventPublisher } = await import(
          '../../src/modules/activity/services/event-publisher.js'
        );
        const publisher = new EventPublisher(app);
        await publisher.publish(`team:${teamId}`, {
          type: 'commit',
          repo: 'org/test-repo',
          author: 'dev1',
          timestamp: new Date().toISOString(),
          summary: 'feat: add broadcast test',
        });

        // ws1 should receive the event
        const event1 = await wait1('event');
        expect(event1.room).toBe(`team:${teamId}`);
        expect((event1.event as Record<string, unknown>).summary).toBe(
          'feat: add broadcast test'
        );

        // ws2 should NOT receive the event (expect timeout)
        const noEvent = await wait2('event', 500).catch(() => null);
        expect(noEvent).toBeNull();
      } finally {
        ws1.close();
        ws2.close();
      }
    });
  });
});
