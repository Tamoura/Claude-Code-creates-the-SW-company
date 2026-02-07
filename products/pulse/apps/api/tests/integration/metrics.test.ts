import { FastifyInstance } from 'fastify';
import {
  getTestApp,
  closeTestApp,
  cleanDatabase,
} from '../helpers/build-app.js';

describe('Metrics Routes', () => {
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
        email: 'metricsuser@pulse.dev',
        password: 'SecureP@ss123',
        name: 'Metrics Test User',
      },
    });
    const regBody = JSON.parse(regResponse.payload);
    authToken = regBody.token;
    userId = regBody.user.id;

    // Create a team
    const team = await app.prisma.team.create({
      data: { name: 'Metrics Team', slug: 'metrics-team' },
    });
    teamId = team.id;

    // Add user as admin of the team
    await app.prisma.teamMember.create({
      data: { userId, teamId, role: 'ADMIN' },
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/metrics/velocity
  // ────────────────────────────────────────

  describe('GET /api/v1/metrics/velocity', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics/velocity',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when teamId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics/velocity',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return empty velocity metrics when no data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/velocity?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.prsMerged).toBe(0);
      expect(body.medianCycleTimeHours).toBeNull();
      expect(body.medianReviewTimeHours).toBeNull();
      expect(body.period).toBeDefined();
    });

    it('should compute velocity from merged PRs', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 11111,
          name: 'velocity-repo',
          fullName: 'org/velocity-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
      const oneDayAgo = new Date(now.getTime() - 1 * 86400000);

      // Merged PR with 24h cycle time, 12h review time
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(100),
          number: 1,
          title: 'feat: add login',
          state: 'merged',
          createdAt: threeDaysAgo,
          updatedAt: twoDaysAgo,
          mergedAt: twoDaysAgo,
          firstReviewAt: new Date(
            threeDaysAgo.getTime() + 12 * 3600000
          ),
        },
      });

      // Another merged PR with 48h cycle time, 24h review time
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(101),
          number: 2,
          title: 'fix: auth bug',
          state: 'merged',
          createdAt: threeDaysAgo,
          updatedAt: oneDayAgo,
          mergedAt: oneDayAgo,
          firstReviewAt: new Date(
            threeDaysAgo.getTime() + 24 * 3600000
          ),
        },
      });

      // Open PR (should not count toward merged)
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(102),
          number: 3,
          title: 'wip: something',
          state: 'open',
          createdAt: oneDayAgo,
          updatedAt: now,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/velocity?teamId=${teamId}&period=7d`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.prsMerged).toBe(2);
      expect(body.medianCycleTimeHours).toBeGreaterThan(0);
      expect(body.medianReviewTimeHours).toBeGreaterThan(0);
    });

    it('should respect period filter', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 22222,
          name: 'period-repo',
          fullName: 'org/period-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 86400000);
      const thirtyNineDaysAgo = new Date(
        now.getTime() - 39 * 86400000
      );
      const oneDayAgo = new Date(now.getTime() - 1 * 86400000);

      // PR merged 40 days ago (outside 30d window)
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(200),
          number: 10,
          title: 'old PR',
          state: 'merged',
          createdAt: fortyDaysAgo,
          updatedAt: thirtyNineDaysAgo,
          mergedAt: thirtyNineDaysAgo,
        },
      });

      // PR merged 1 day ago (inside 30d window)
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(201),
          number: 11,
          title: 'recent PR',
          state: 'merged',
          createdAt: new Date(now.getTime() - 2 * 86400000),
          updatedAt: oneDayAgo,
          mergedAt: oneDayAgo,
        },
      });

      // 30d period should only include the recent PR
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/velocity?teamId=${teamId}&period=30d`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.prsMerged).toBe(1);
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/metrics/coverage
  // ────────────────────────────────────────

  describe('GET /api/v1/metrics/coverage', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics/coverage',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when teamId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics/coverage',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return empty coverage data when no reports', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/coverage?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.repositories).toEqual([]);
      expect(body.teamAverage).toBeNull();
    });

    it('should return coverage per repo with trend', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 33333,
          name: 'coverage-repo',
          fullName: 'org/coverage-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

      // Older coverage report
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo.id,
          commitSha: 'abc123',
          coverage: 75.5,
          reportedAt: fiveDaysAgo,
        },
      });

      // Latest coverage report
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo.id,
          commitSha: 'def456',
          coverage: 82.3,
          reportedAt: twoDaysAgo,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/coverage?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.repositories).toHaveLength(1);
      expect(body.repositories[0].repoName).toBe('coverage-repo');
      expect(body.repositories[0].latestCoverage).toBe(82.3);
      expect(body.repositories[0].previousCoverage).toBe(75.5);
      expect(body.repositories[0].trend).toBe('up');
      expect(body.teamAverage).toBe(82.3);
    });

    it('should filter by repoId when provided', async () => {
      const repo1 = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 44444,
          name: 'repo-one',
          fullName: 'org/repo-one',
          syncStatus: 'complete',
        },
      });

      const repo2 = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 55555,
          name: 'repo-two',
          fullName: 'org/repo-two',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo1.id,
          commitSha: 'aaa111',
          coverage: 90.0,
          reportedAt: now,
        },
      });
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo2.id,
          commitSha: 'bbb222',
          coverage: 70.0,
          reportedAt: now,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/coverage?teamId=${teamId}&repoId=${repo1.id}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.repositories).toHaveLength(1);
      expect(body.repositories[0].repoName).toBe('repo-one');
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/metrics/summary
  // ────────────────────────────────────────

  describe('GET /api/v1/metrics/summary', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics/summary',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when teamId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics/summary',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return summary with all metrics', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 66666,
          name: 'summary-repo',
          fullName: 'org/summary-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
      const oneDayAgo = new Date(now.getTime() - 1 * 86400000);

      // Create merged PRs
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(300),
          number: 20,
          title: 'feat: dashboard',
          state: 'merged',
          createdAt: twoDaysAgo,
          updatedAt: oneDayAgo,
          mergedAt: oneDayAgo,
          firstReviewAt: new Date(
            twoDaysAgo.getTime() + 6 * 3600000
          ),
        },
      });

      // Create commits
      await app.prisma.commit.create({
        data: {
          repoId: repo.id,
          sha: 'commit-abc',
          message: 'feat: add metrics',
          committedAt: oneDayAgo,
          additions: 100,
          deletions: 20,
        },
      });

      // Create coverage report
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo.id,
          commitSha: 'commit-abc',
          coverage: 85.0,
          reportedAt: oneDayAgo,
        },
      });

      // Create deployment
      await app.prisma.deployment.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(400),
          environment: 'production',
          status: 'success',
          commitSha: 'commit-abc',
          createdAt: oneDayAgo,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/summary?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.velocity).toBeDefined();
      expect(body.velocity.prsMerged).toBe(1);
      expect(body.coverage).toBeDefined();
      expect(body.coverage.teamAverage).toBe(85.0);
      expect(body.activity).toBeDefined();
      expect(body.activity.commitCount).toBe(1);
      expect(body.activity.deploymentCount).toBe(1);
    });

    it('should return zeroed summary when no data exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/metrics/summary?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.velocity.prsMerged).toBe(0);
      expect(body.coverage.teamAverage).toBeNull();
      expect(body.activity.commitCount).toBe(0);
      expect(body.activity.deploymentCount).toBe(0);
    });
  });

  // ────────────────────────────────────────
  // POST /api/v1/metrics/aggregate
  // ────────────────────────────────────────

  describe('POST /api/v1/metrics/aggregate', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/metrics/aggregate',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should run aggregation and store metric snapshots', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 77777,
          name: 'agg-repo',
          fullName: 'org/agg-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 1 * 86400000);

      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(500),
          number: 30,
          title: 'feat: aggregation test',
          state: 'merged',
          createdAt: oneDayAgo,
          updatedAt: now,
          mergedAt: now,
        },
      });

      await app.prisma.coverageReport.create({
        data: {
          repoId: repo.id,
          commitSha: 'agg-commit',
          coverage: 78.5,
          reportedAt: now,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/metrics/aggregate?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.snapshotsCreated).toBeGreaterThan(0);

      // Verify snapshots were stored
      const snapshots = await app.prisma.metricSnapshot.findMany({
        where: { teamId },
      });
      expect(snapshots.length).toBeGreaterThan(0);
    });
  });
});
