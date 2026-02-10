import { FastifyInstance } from 'fastify';
import {
  getTestApp,
  closeTestApp,
  cleanDatabase,
} from '../helpers/build-app.js';
import { hashPassword } from '../../src/utils/crypto.js';

/**
 * Create a user directly in DB and return a signed JWT.
 */
async function createUserWithToken(
  app: FastifyInstance,
  email: string,
  name: string
) {
  const passwordHash = await hashPassword('SecureP@ss123');
  const user = await app.prisma.user.create({
    data: { email, passwordHash, name },
  });
  const token = app.jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    { expiresIn: '1h' }
  );
  return { token, userId: user.id };
}

describe('Risk Routes', () => {
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

    const { token, userId: uid } = await createUserWithToken(
      app,
      'riskuser@pulse.dev',
      'Risk Test User'
    );
    authToken = token;
    userId = uid;

    const team = await app.prisma.team.create({
      data: { name: 'Risk Team', slug: 'risk-team' },
    });
    teamId = team.id;

    await app.prisma.teamMember.create({
      data: { userId, teamId, role: 'ADMIN' },
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/risk/current
  // ────────────────────────────────────────

  describe('GET /api/v1/risk/current', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risk/current',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when teamId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risk/current',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return low risk score when no data exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.score).toBe(0);
      expect(body.level).toBe('low');
      expect(body.explanation).toBeDefined();
      expect(typeof body.explanation).toBe('string');
      expect(body.factors).toBeDefined();
      expect(Array.isArray(body.factors)).toBe(true);
      expect(body.factors).toHaveLength(7);
    });

    it('should compute risk from velocity trend data', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 90001,
          name: 'risk-repo',
          fullName: 'org/risk-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const sprintStart = new Date(now.getTime() - 14 * 86400000);

      // Create only 2 merged PRs in a 14-day sprint
      // where an average team might expect 10+
      // This should trigger velocity trend concern
      for (let i = 0; i < 2; i++) {
        const createdAt = new Date(
          sprintStart.getTime() + i * 86400000
        );
        await app.prisma.pullRequest.create({
          data: {
            repoId: repo.id,
            githubId: BigInt(9000 + i),
            number: i + 1,
            title: `PR ${i + 1}`,
            state: 'merged',
            createdAt,
            updatedAt: new Date(createdAt.getTime() + 86400000),
            mergedAt: new Date(createdAt.getTime() + 86400000),
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(body.level);
      expect(body.factors).toHaveLength(7);

      // Each factor should have name, score, weight, detail
      for (const factor of body.factors) {
        expect(factor.name).toBeDefined();
        expect(typeof factor.score).toBe('number');
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
        expect(typeof factor.weight).toBe('number');
        expect(factor.detail).toBeDefined();
      }
    });

    it('should detect PR review backlog risk', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 90002,
          name: 'backlog-repo',
          fullName: 'org/backlog-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      // Create 5 open PRs older than 24h without any reviews
      for (let i = 0; i < 5; i++) {
        await app.prisma.pullRequest.create({
          data: {
            repoId: repo.id,
            githubId: BigInt(8000 + i),
            number: 100 + i,
            title: `Stale PR ${i}`,
            state: 'open',
            createdAt: new Date(now.getTime() - 48 * 3600000),
            updatedAt: new Date(now.getTime() - 48 * 3600000),
            firstReviewAt: null,
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      // Find the PR review backlog factor
      const backlogFactor = body.factors.find(
        (f: any) => f.name === 'PR Review Backlog'
      );
      expect(backlogFactor).toBeDefined();
      expect(backlogFactor.score).toBeGreaterThan(0);
    });

    it('should detect large PR ratio risk', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 90003,
          name: 'large-pr-repo',
          fullName: 'org/large-pr-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      // 3 large open PRs (>500 lines) out of 4 total
      for (let i = 0; i < 3; i++) {
        await app.prisma.pullRequest.create({
          data: {
            repoId: repo.id,
            githubId: BigInt(7000 + i),
            number: 200 + i,
            title: `Large PR ${i}`,
            state: 'open',
            additions: 600,
            deletions: 100,
            createdAt: new Date(now.getTime() - 86400000),
            updatedAt: now,
          },
        });
      }
      // 1 small open PR
      await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(7003),
          number: 203,
          title: 'Small PR',
          state: 'open',
          additions: 20,
          deletions: 5,
          createdAt: new Date(now.getTime() - 86400000),
          updatedAt: now,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const largePrFactor = body.factors.find(
        (f: any) => f.name === 'Large PR Ratio'
      );
      expect(largePrFactor).toBeDefined();
      expect(largePrFactor.score).toBeGreaterThan(0);
    });

    it('should store a risk snapshot after computation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      // Verify snapshot was stored in DB
      const snapshots = await app.prisma.riskSnapshot.findMany({
        where: { teamId },
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].score).toBe(0);
      expect(snapshots[0].level).toBe('low');
      expect(snapshots[0].explanation).toBeDefined();
    });

    it('should cap risk score at 100', async () => {
      // Even if all factors are at max, score should not exceed 100
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 90004,
          name: 'max-risk-repo',
          fullName: 'org/max-risk-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      // Create extreme conditions for multiple factors
      // 10 open PRs older than 48h without reviews (backlog)
      for (let i = 0; i < 10; i++) {
        await app.prisma.pullRequest.create({
          data: {
            repoId: repo.id,
            githubId: BigInt(6000 + i),
            number: 300 + i,
            title: `Extreme PR ${i}`,
            state: 'open',
            additions: 1200,
            deletions: 300,
            createdAt: new Date(now.getTime() - 72 * 3600000),
            updatedAt: new Date(now.getTime() - 72 * 3600000),
            firstReviewAt: null,
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.score).toBeLessThanOrEqual(100);
    });
  });

  // ────────────────────────────────────────
  // GET /api/v1/risk/history
  // ────────────────────────────────────────

  describe('GET /api/v1/risk/history', () => {
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risk/history',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when teamId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risk/history',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return empty history when no snapshots', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/history?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.snapshots).toEqual([]);
      expect(body.teamId).toBe(teamId);
    });

    it('should return stored risk snapshots', async () => {
      const now = new Date();

      // Seed some risk snapshots
      await app.prisma.riskSnapshot.createMany({
        data: [
          {
            teamId,
            score: 25,
            level: 'low',
            explanation: 'Sprint risk is 25 (low).',
            factors: JSON.stringify([]),
            calculatedAt: new Date(now.getTime() - 4 * 3600000),
          },
          {
            teamId,
            score: 55,
            level: 'medium',
            explanation: 'Sprint risk is 55 (medium).',
            factors: JSON.stringify([]),
            calculatedAt: new Date(now.getTime() - 8 * 3600000),
          },
          {
            teamId,
            score: 72,
            level: 'high',
            explanation: 'Sprint risk is 72 (high).',
            factors: JSON.stringify([]),
            calculatedAt: now,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/history?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.snapshots).toHaveLength(3);
      // Should be ordered by calculatedAt desc (most recent first)
      expect(body.snapshots[0].score).toBe(72);
      expect(body.snapshots[1].score).toBe(25);
      expect(body.snapshots[2].score).toBe(55);
    });

    it('should filter history by days parameter', async () => {
      const now = new Date();

      await app.prisma.riskSnapshot.createMany({
        data: [
          {
            teamId,
            score: 30,
            level: 'low',
            explanation: 'Recent snapshot',
            factors: JSON.stringify([]),
            calculatedAt: new Date(now.getTime() - 1 * 86400000),
          },
          {
            teamId,
            score: 60,
            level: 'medium',
            explanation: 'Old snapshot',
            factors: JSON.stringify([]),
            calculatedAt: new Date(now.getTime() - 45 * 86400000),
          },
        ],
      });

      // Default 30 days should only include the recent one
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/history?teamId=${teamId}&days=30`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.snapshots).toHaveLength(1);
      expect(body.snapshots[0].score).toBe(30);
    });

    it('should return both snapshots with wider days filter', async () => {
      const now = new Date();

      await app.prisma.riskSnapshot.createMany({
        data: [
          {
            teamId,
            score: 30,
            level: 'low',
            explanation: 'Recent snapshot',
            factors: JSON.stringify([]),
            calculatedAt: new Date(now.getTime() - 1 * 86400000),
          },
          {
            teamId,
            score: 60,
            level: 'medium',
            explanation: 'Older snapshot',
            factors: JSON.stringify([]),
            calculatedAt: new Date(now.getTime() - 45 * 86400000),
          },
        ],
      });

      // 90 days should include both
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/history?teamId=${teamId}&days=90`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.snapshots).toHaveLength(2);
    });

    it('should include factor details in history snapshots', async () => {
      const factors = [
        {
          name: 'Velocity Trend',
          score: 40,
          weight: 0.25,
          detail: '4 of 10 PRs merged',
        },
      ];

      await app.prisma.riskSnapshot.create({
        data: {
          teamId,
          score: 40,
          level: 'medium',
          explanation: 'Sprint risk is 40 (medium).',
          factors: JSON.stringify(factors),
          calculatedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/history?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.snapshots).toHaveLength(1);
      const snapshot = body.snapshots[0];
      expect(snapshot.factors).toBeDefined();
    });
  });

  // ────────────────────────────────────────
  // Risk factor edge cases
  // ────────────────────────────────────────

  describe('Risk factor computation edge cases', () => {
    it('should handle team with no repositories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.score).toBe(0);
      expect(body.level).toBe('low');
    });

    it('should handle review load imbalance factor', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 90005,
          name: 'review-repo',
          fullName: 'org/review-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

      // Create PRs with reviews heavily concentrated on one reviewer
      const pr = await app.prisma.pullRequest.create({
        data: {
          repoId: repo.id,
          githubId: BigInt(5000),
          number: 400,
          title: 'PR with reviews',
          state: 'merged',
          createdAt: threeDaysAgo,
          updatedAt: now,
          mergedAt: now,
        },
      });

      // reviewer-a has 6 reviews
      for (let i = 0; i < 6; i++) {
        await app.prisma.review.create({
          data: {
            prId: pr.id,
            githubId: BigInt(4000 + i),
            reviewerGithubUsername: 'reviewer-a',
            state: 'approved',
            submittedAt: new Date(
              threeDaysAgo.getTime() + i * 3600000
            ),
          },
        });
      }

      // reviewer-b has 1 review
      await app.prisma.review.create({
        data: {
          prId: pr.id,
          githubId: BigInt(4010),
          reviewerGithubUsername: 'reviewer-b',
          state: 'approved',
          submittedAt: now,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const imbalanceFactor = body.factors.find(
        (f: any) => f.name === 'Review Load Imbalance'
      );
      expect(imbalanceFactor).toBeDefined();
      expect(imbalanceFactor.score).toBeGreaterThan(0);
    });

    it('should detect coverage decline risk', async () => {
      const repo = await app.prisma.repository.create({
        data: {
          teamId,
          githubId: 90006,
          name: 'coverage-decline-repo',
          fullName: 'org/coverage-decline-repo',
          syncStatus: 'complete',
        },
      });

      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

      // Sprint start coverage: 85%
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo.id,
          commitSha: 'start-commit',
          coverage: 85.0,
          reportedAt: twoWeeksAgo,
        },
      });

      // Current coverage: 78% (7% drop, exceeds 3% threshold)
      await app.prisma.coverageReport.create({
        data: {
          repoId: repo.id,
          commitSha: 'latest-commit',
          coverage: 78.0,
          reportedAt: now,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const coverageFactor = body.factors.find(
        (f: any) => f.name === 'Test Coverage Delta'
      );
      expect(coverageFactor).toBeDefined();
      expect(coverageFactor.score).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────
  // Team Membership Enforcement
  // ────────────────────────────────────────

  describe('Team membership enforcement', () => {
    it('should return 403 when non-member accesses risk', async () => {
      const { token: outsiderToken } = await createUserWithToken(
        app,
        'outsider-risk@pulse.dev',
        'Risk Outsider'
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/current?teamId=${teamId}`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 when non-member accesses risk history', async () => {
      const { token: outsiderToken } = await createUserWithToken(
        app,
        'outsider-hist@pulse.dev',
        'History Outsider'
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risk/history?teamId=${teamId}`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
