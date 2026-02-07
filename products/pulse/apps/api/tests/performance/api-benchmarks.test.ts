/**
 * API Response Time Benchmarks
 *
 * Measures p50/p95/p99 response times for key endpoints.
 * Acceptance criteria: p95 < 200ms for all endpoints.
 *
 * These benchmarks run against a real database with seeded data.
 */

import { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp, cleanDatabase } from '../helpers/build-app.js';

const P95_TARGET_MS = 200;
const ITERATIONS = 20;

interface TimingResult {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
}

function computePercentiles(times: number[]): {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
} {
  const sorted = [...times].sort((a, b) => a - b);
  const len = sorted.length;
  return {
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    min: sorted[0],
    max: sorted[len - 1],
    mean: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
  };
}

async function measureEndpoint(
  app: FastifyInstance,
  method: string,
  url: string,
  options?: {
    headers?: Record<string, string>;
    payload?: unknown;
  }
): Promise<number[]> {
  const times: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await app.inject({
      method: method as any,
      url,
      headers: options?.headers,
      payload: options?.payload,
    });
    const elapsed = Math.round(performance.now() - start);
    times.push(elapsed);
  }

  return times;
}

describe('API Response Time Benchmarks', () => {
  let app: FastifyInstance;
  let authToken: string;
  let teamId: string;
  let repoId: string;

  beforeAll(async () => {
    app = await getTestApp();
    await cleanDatabase(app);

    // Seed: create user, team, team membership, repository,
    // and some sample data for metrics queries
    const user = await app.prisma.user.create({
      data: {
        email: 'perf-bench@test.com',
        name: 'Perf Benchmark',
        passwordHash: '$2b$12$placeholder',
      },
    });

    const team = await app.prisma.team.create({
      data: { name: 'Perf Team', slug: 'perf-team' },
    });
    teamId = team.id;

    await app.prisma.teamMember.create({
      data: { userId: user.id, teamId: team.id, role: 'ADMIN' },
    });

    const repo = await app.prisma.repository.create({
      data: {
        teamId: team.id,
        githubId: BigInt(900001),
        name: 'perf-repo',
        fullName: 'org/perf-repo',
        defaultBranch: 'main',
      },
    });
    repoId = repo.id;

    // Seed commits (50)
    const commitData = Array.from({ length: 50 }, (_, i) => ({
      repoId: repo.id,
      sha: `perf-sha-${i.toString().padStart(4, '0')}`,
      message: `Perf commit ${i}`,
      authorGithubUsername: 'perf-dev',
      committedAt: new Date(Date.now() - i * 3600000),
      additions: Math.floor(Math.random() * 100),
      deletions: Math.floor(Math.random() * 50),
      branch: 'main',
    }));
    await app.prisma.commit.createMany({ data: commitData });

    // Seed pull requests (20)
    const prData = Array.from({ length: 20 }, (_, i) => ({
      repoId: repo.id,
      githubId: BigInt(800000 + i),
      number: i + 1,
      title: `Perf PR ${i}`,
      state: i % 3 === 0 ? 'merged' as const : 'open' as const,
      authorGithubUsername: 'perf-dev',
      additions: Math.floor(Math.random() * 200),
      deletions: Math.floor(Math.random() * 100),
      createdAt: new Date(Date.now() - i * 86400000),
      updatedAt: new Date(Date.now() - i * 86400000 + 3600000),
      mergedAt: i % 3 === 0
        ? new Date(Date.now() - i * 86400000 + 7200000)
        : null,
      firstReviewAt: i % 2 === 0
        ? new Date(Date.now() - i * 86400000 + 1800000)
        : null,
    }));
    await app.prisma.pullRequest.createMany({ data: prData });

    // Seed coverage reports (10)
    const coverageData = Array.from({ length: 10 }, (_, i) => ({
      repoId: repo.id,
      commitSha: `coverage-sha-${i}`,
      coverage: 80 + Math.random() * 15,
      reportedAt: new Date(Date.now() - i * 86400000),
    }));
    await app.prisma.coverageReport.createMany({ data: coverageData });

    // Get auth token
    authToken = app.jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await closeTestApp();
  });

  const results: TimingResult[] = [];

  it('should benchmark GET /health', async () => {
    const times = await measureEndpoint(app, 'GET', '/health');
    const stats = computePercentiles(times);
    results.push({ endpoint: 'GET /health', method: 'GET', ...stats });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should benchmark POST /api/v1/auth/login', async () => {
    // First register a user for login tests
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'perf-login@test.com',
        password: 'PerfTest123!',
        name: 'Perf Login',
      },
    });

    const times = await measureEndpoint(
      app,
      'POST',
      '/api/v1/auth/login',
      {
        payload: {
          email: 'perf-login@test.com',
          password: 'PerfTest123!',
        },
      }
    );
    const stats = computePercentiles(times);
    results.push({
      endpoint: 'POST /api/v1/auth/login',
      method: 'POST',
      ...stats,
    });

    // Login includes bcrypt verification (cost 12) so we allow
    // a slightly higher threshold. Bcrypt is intentionally slow.
    // The important thing is that it finishes in a reasonable
    // time even under load.
    expect(stats.p95).toBeLessThan(500);
  });

  it('should benchmark GET /api/v1/repos', async () => {
    const times = await measureEndpoint(
      app,
      'GET',
      `/api/v1/repos?teamId=${teamId}`,
      { headers: { authorization: `Bearer ${authToken}` } }
    );
    const stats = computePercentiles(times);
    results.push({
      endpoint: 'GET /api/v1/repos',
      method: 'GET',
      ...stats,
    });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should benchmark GET /api/v1/metrics/velocity', async () => {
    const times = await measureEndpoint(
      app,
      'GET',
      `/api/v1/metrics/velocity?teamId=${teamId}&period=30d`,
      { headers: { authorization: `Bearer ${authToken}` } }
    );
    const stats = computePercentiles(times);
    results.push({
      endpoint: 'GET /api/v1/metrics/velocity',
      method: 'GET',
      ...stats,
    });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should benchmark GET /api/v1/metrics/coverage', async () => {
    const times = await measureEndpoint(
      app,
      'GET',
      `/api/v1/metrics/coverage?teamId=${teamId}`,
      { headers: { authorization: `Bearer ${authToken}` } }
    );
    const stats = computePercentiles(times);
    results.push({
      endpoint: 'GET /api/v1/metrics/coverage',
      method: 'GET',
      ...stats,
    });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should benchmark GET /api/v1/metrics/summary', async () => {
    const times = await measureEndpoint(
      app,
      'GET',
      `/api/v1/metrics/summary?teamId=${teamId}&period=30d`,
      { headers: { authorization: `Bearer ${authToken}` } }
    );
    const stats = computePercentiles(times);
    results.push({
      endpoint: 'GET /api/v1/metrics/summary',
      method: 'GET',
      ...stats,
    });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should benchmark GET /api/v1/activity', async () => {
    const times = await measureEndpoint(
      app,
      'GET',
      `/api/v1/activity?teamId=${teamId}&limit=20`,
      { headers: { authorization: `Bearer ${authToken}` } }
    );
    const stats = computePercentiles(times);
    results.push({
      endpoint: 'GET /api/v1/activity',
      method: 'GET',
      ...stats,
    });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should benchmark POST /api/v1/webhooks/github', async () => {
    // Webhook endpoint with signature verification
    const crypto = await import('crypto');
    const payload = JSON.stringify({
      ref: 'refs/heads/main',
      repository: { id: 900001, full_name: 'org/perf-repo' },
      commits: [
        {
          id: `bench-commit-${Date.now()}`,
          message: 'benchmark commit',
          timestamp: new Date().toISOString(),
          author: { name: 'bench', email: 'bench@test.com' },
          added: [],
          removed: [],
          modified: ['file.ts'],
        },
      ],
    });

    const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const signature = `sha256=${hmac.digest('hex')}`;

    const times: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const iterPayload = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { id: 900001, full_name: 'org/perf-repo' },
        commits: [
          {
            id: `bench-commit-${Date.now()}-${i}`,
            message: `benchmark commit ${i}`,
            timestamp: new Date().toISOString(),
            author: { name: 'bench', email: 'bench@test.com' },
            added: [],
            removed: [],
            modified: ['file.ts'],
          },
        ],
      });

      const iterHmac = crypto.createHmac('sha256', secret);
      iterHmac.update(iterPayload);
      const iterSig = `sha256=${iterHmac.digest('hex')}`;

      const start = performance.now();
      await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/github',
        headers: {
          'x-hub-signature-256': iterSig,
          'x-github-event': 'push',
          'x-github-delivery': `bench-${i}`,
          'content-type': 'application/json',
        },
        payload: iterPayload,
      });
      times.push(Math.round(performance.now() - start));
    }

    const stats = computePercentiles(times);
    results.push({
      endpoint: 'POST /api/v1/webhooks/github',
      method: 'POST',
      ...stats,
    });

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('should print benchmark results', () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║          API RESPONSE TIME BENCHMARKS                ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(
      '║ Endpoint                        │ p50  │ p95  │ p99  ║'
    );
    console.log(
      '╟─────────────────────────────────┼──────┼──────┼──────╢'
    );

    for (const r of results) {
      const ep = r.endpoint.padEnd(33);
      const p50 = `${r.p50}ms`.padStart(5);
      const p95 = `${r.p95}ms`.padStart(5);
      const p99 = `${r.p99}ms`.padStart(5);
      const pass = r.p95 < P95_TARGET_MS ? 'PASS' : 'FAIL';
      console.log(`║ ${ep}│${p50} │${p95} │${p99} ║ ${pass}`);
    }

    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`Target: p95 < ${P95_TARGET_MS}ms (except login: <500ms)`);
    console.log(`Iterations per endpoint: ${ITERATIONS}\n`);

    // All non-login endpoints should meet p95 target
    const failures = results.filter(
      (r) =>
        r.endpoint !== 'POST /api/v1/auth/login' &&
        r.p95 >= P95_TARGET_MS
    );
    expect(failures).toHaveLength(0);
  });
});
