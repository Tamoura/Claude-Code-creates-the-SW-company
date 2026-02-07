import { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp, cleanDatabase } from '../helpers/build-app.js';

describe('Repos Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await closeTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);

    // Register a user and get a token
    const regResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'repouser@pulse.dev',
        password: 'SecureP@ss123',
        name: 'Repo Test User',
      },
    });
    const regBody = JSON.parse(regResponse.payload);
    authToken = regBody.token;
    userId = regBody.user.id;

    // Create a team for this user
    const team = await app.prisma.team.create({
      data: {
        name: 'Test Team',
        slug: 'test-team',
      },
    });
    teamId = team.id;

    // Add user as admin
    await app.prisma.teamMember.create({
      data: {
        userId,
        teamId,
        role: 'ADMIN',
      },
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/repos - List connected repos
  // ────────────────────────────────────────

  describe('GET /api/v1/repos', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repos',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return empty list when no repos connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repos?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    it('should return connected repos with pagination', async () => {
      // Create some repos
      await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 12345,
          name: 'test-repo',
          fullName: 'org/test-repo',
          language: 'TypeScript',
          defaultBranch: 'main',
          isPrivate: false,
          syncStatus: 'complete',
        },
      });
      await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 67890,
          name: 'another-repo',
          fullName: 'org/another-repo',
          language: 'Python',
          defaultBranch: 'main',
          isPrivate: true,
          syncStatus: 'idle',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repos?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    it('should not include disconnected repos', async () => {
      await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 12345,
          name: 'active-repo',
          fullName: 'org/active-repo',
          syncStatus: 'complete',
        },
      });
      await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 67890,
          name: 'disconnected-repo',
          fullName: 'org/disconnected-repo',
          syncStatus: 'complete',
          disconnectedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repos?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('active-repo');
    });

    it('should return 400 when teamId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repos',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should respect pagination limit', async () => {
      // Create 3 repos
      for (let i = 1; i <= 3; i++) {
        await app.prisma.repository.create({
          data: {
            teamId,
            githubId: 10000 + i,
            name: `repo-${i}`,
            fullName: `org/repo-${i}`,
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repos?teamId=${teamId}&limit=2&page=1`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(3);
      expect(body.pagination.totalPages).toBe(2);
      expect(body.pagination.hasMore).toBe(true);
    });

    it('should filter repos by syncStatus', async () => {
      await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 12345,
          name: 'synced-repo',
          fullName: 'org/synced-repo',
          syncStatus: 'complete',
        },
      });
      await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 67890,
          name: 'syncing-repo',
          fullName: 'org/syncing-repo',
          syncStatus: 'syncing',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repos?teamId=${teamId}&syncStatus=complete`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('synced-repo');
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/repos/available
  // ────────────────────────────────────────

  describe('GET /api/v1/repos/available', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repos/available',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when user has no GitHub token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repos/available',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.detail).toContain('GitHub');
    });
  });

  // ────────────────────────────────────────
  // POST /api/v1/repos - Connect a repo
  // ────────────────────────────────────────

  describe('POST /api/v1/repos', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repos',
        payload: {
          teamId,
          githubId: 12345,
          name: 'test-repo',
          fullName: 'org/test-repo',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should connect a new repo and return 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repos',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          teamId,
          githubId: 12345,
          name: 'test-repo',
          fullName: 'org/test-repo',
          language: 'TypeScript',
          defaultBranch: 'main',
          isPrivate: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('test-repo');
      expect(body.fullName).toBe('org/test-repo');
      expect(body.syncStatus).toBe('idle');
    });

    it('should return 422 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repos',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          teamId,
          // Missing githubId, name, fullName
        },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return 409 when repo already connected to team', async () => {
      const payload = {
        teamId,
        githubId: 12345,
        name: 'test-repo',
        fullName: 'org/test-repo',
      };

      // Connect first time
      await app.inject({
        method: 'POST',
        url: '/api/v1/repos',
        headers: { authorization: `Bearer ${authToken}` },
        payload,
      });

      // Connect same repo again
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/repos',
        headers: { authorization: `Bearer ${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ────────────────────────────────────────
  // DELETE /api/v1/repos/:id - Disconnect
  // ────────────────────────────────────────

  describe('DELETE /api/v1/repos/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/repos/some-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should disconnect a repo and return 200', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 12345,
          name: 'test-repo',
          fullName: 'org/test-repo',
          syncStatus: 'complete',
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/repos/${repo.id}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Repository disconnected');

      // Verify soft-delete - disconnectedAt should be set
      const updated = await app.prisma.repository.findUnique({
        where: { id: repo.id },
      });
      expect(updated?.disconnectedAt).toBeTruthy();
    });

    it('should return 404 for non-existent repo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/repos/nonexistent-id',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/repos/:id/sync-status
  // ────────────────────────────────────────

  describe('GET /api/v1/repos/:id/sync-status', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repos/some-id/sync-status',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return sync status for a connected repo', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 12345,
          name: 'test-repo',
          fullName: 'org/test-repo',
          syncStatus: 'syncing',
          syncProgress: 45,
          syncStartedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repos/${repo.id}/sync-status`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.syncStatus).toBe('syncing');
      expect(body.syncProgress).toBe(45);
      expect(body.syncStartedAt).toBeDefined();
    });

    it('should return 404 for non-existent repo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repos/nonexistent-id/sync-status',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
