import * as crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp, cleanDatabase } from '../helpers/build-app.js';

const WEBHOOK_SECRET = 'test-webhook-secret';

function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

describe('Webhook Routes', () => {
  let app: FastifyInstance;
  let teamId: string;
  let repoId: string;

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    app = await getTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await closeTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);

    // Create a team
    const team = await app.prisma.team.create({
      data: { name: 'Webhook Team', slug: 'webhook-team' },
    });
    teamId = team.id;

    // Create a connected repo with a webhook secret
    const repo = await app.prisma.repository.create({
      data: {
        teamId,
        githubId: 12345,
        name: 'test-repo',
        fullName: 'org/test-repo',
        webhookSecret: WEBHOOK_SECRET,
        syncStatus: 'complete',
      },
    });
    repoId = repo.id;
  });

  // ────────────────────────────────────────
  // POST /api/v1/webhooks/github
  // ────────────────────────────────────────

  describe('POST /api/v1/webhooks/github', () => {
    it('should return 401 with invalid signature', async () => {
      const payload = JSON.stringify({
        repository: { id: 12345 },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': 'sha256=invalidsignature',
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-id',
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 200 for valid push event', async () => {
      const payload = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { id: 12345, full_name: 'org/test-repo' },
        commits: [
          {
            id: 'abc123def456',
            message: 'feat: add new feature',
            timestamp: '2025-01-15T10:30:00Z',
            author: {
              name: 'Test Dev',
              email: 'dev@test.com',
              username: 'testdev',
            },
            added: ['src/new.ts'],
            removed: [],
            modified: ['src/existing.ts'],
          },
        ],
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-push',
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('processed');
    });

    it('should store commits from push events in the database', async () => {
      const payload = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { id: 12345, full_name: 'org/test-repo' },
        commits: [
          {
            id: 'commit-sha-001',
            message: 'feat: first commit',
            timestamp: '2025-01-15T10:30:00Z',
            author: {
              name: 'Test Dev',
              email: 'dev@test.com',
              username: 'testdev',
            },
            added: ['a.ts', 'b.ts'],
            removed: [],
            modified: ['c.ts'],
          },
          {
            id: 'commit-sha-002',
            message: 'fix: second commit',
            timestamp: '2025-01-15T10:35:00Z',
            author: {
              name: 'Test Dev',
              email: 'dev@test.com',
              username: 'testdev',
            },
            added: [],
            removed: ['old.ts'],
            modified: [],
          },
        ],
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-push-store',
        },
        payload,
      });

      const commits = await app.prisma.commit.findMany({
        where: { repoId },
        orderBy: { committedAt: 'asc' },
      });

      expect(commits).toHaveLength(2);
      expect(commits[0].sha).toBe('commit-sha-001');
      expect(commits[0].message).toBe('feat: first commit');
      expect(commits[0].authorGithubUsername).toBe('testdev');
      expect(commits[1].sha).toBe('commit-sha-002');
    });

    it('should handle pull_request events', async () => {
      const payload = JSON.stringify({
        action: 'opened',
        number: 42,
        pull_request: {
          id: 99001,
          number: 42,
          title: 'Add new feature',
          state: 'open',
          user: {
            login: 'testdev',
            avatar_url: 'https://avatars.githubusercontent.com/u/1234',
          },
          additions: 100,
          deletions: 20,
          commits: 3,
          draft: false,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:30:00Z',
          merged_at: null,
          closed_at: null,
          html_url: 'https://github.com/org/test-repo/pull/42',
        },
        repository: { id: 12345, full_name: 'org/test-repo' },
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'pull_request',
          'x-github-delivery': 'test-delivery-pr',
        },
        payload,
      });

      expect(response.statusCode).toBe(200);

      // Verify PR was stored
      const prs = await app.prisma.pullRequest.findMany({
        where: { repoId },
      });
      expect(prs).toHaveLength(1);
      expect(prs[0].title).toBe('Add new feature');
      expect(prs[0].number).toBe(42);
      expect(prs[0].authorGithubUsername).toBe('testdev');
    });

    it('should handle deployment events', async () => {
      const payload = JSON.stringify({
        action: 'created',
        deployment: {
          id: 55001,
          sha: 'deploy-sha-001',
          environment: 'production',
          description: 'Deploy v1.2.0',
          created_at: '2025-01-15T12:00:00Z',
          updated_at: '2025-01-15T12:00:00Z',
        },
        repository: { id: 12345, full_name: 'org/test-repo' },
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'deployment',
          'x-github-delivery': 'test-delivery-deploy',
        },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const deployments = await app.prisma.deployment.findMany({
        where: { repoId },
      });
      expect(deployments).toHaveLength(1);
      expect(deployments[0].commitSha).toBe('deploy-sha-001');
      expect(deployments[0].environment).toBe('production');
    });

    it('should return 404 for unknown repository', async () => {
      const payload = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { id: 99999, full_name: 'unknown/repo' },
        commits: [],
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-unknown',
        },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 200 and ignore unhandled event types', async () => {
      const payload = JSON.stringify({
        action: 'completed',
        repository: { id: 12345, full_name: 'org/test-repo' },
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'check_run',
          'x-github-delivery': 'test-delivery-ignored',
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ignored');
    });

    // ── Fix 1: Raw body signature verification ──────
    it('should verify signature against raw body bytes, not JSON.stringify', async () => {
      // Craft a payload with extra whitespace that JSON.stringify would normalize.
      // GitHub signs the exact bytes it sends, including any whitespace.
      const rawPayload = '{"ref":"refs/heads/main","repository":{"id":12345,"full_name":"org/test-repo"},"commits":[{"id":"raw-body-test","message":"test raw body","timestamp":"2025-01-15T10:30:00Z","author":{"name":"Dev","email":"d@t.com","username":"dev"},"added":["x.ts"],"removed":[],"modified":[]}]}';
      const signature = signPayload(rawPayload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-rawbody',
        },
        payload: rawPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('processed');
    });

    // ── Fix 2: Zod payload validation ───────────────
    it('should return 422 for push event with invalid payload schema', async () => {
      // Missing required "ref" and "commits" fields
      const payload = JSON.stringify({
        repository: { id: 12345, full_name: 'org/test-repo' },
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-invalid-push',
        },
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.payload);
      expect(body.title).toBe('Validation Error');
    });

    it('should return 422 for pull_request event with missing fields', async () => {
      // Missing required "pull_request" field
      const payload = JSON.stringify({
        action: 'opened',
        number: 42,
        repository: { id: 12345, full_name: 'org/test-repo' },
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'pull_request',
          'x-github-delivery': 'test-delivery-invalid-pr',
        },
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.payload);
      expect(body.title).toBe('Validation Error');
    });

    it('should return 422 for deployment event with missing fields', async () => {
      // Missing required "deployment" field
      const payload = JSON.stringify({
        action: 'created',
        repository: { id: 12345, full_name: 'org/test-repo' },
      });
      const signature = signPayload(payload, WEBHOOK_SECRET);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'deployment',
          'x-github-delivery': 'test-delivery-invalid-deploy',
        },
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.payload);
      expect(body.title).toBe('Validation Error');
    });
  });
});
