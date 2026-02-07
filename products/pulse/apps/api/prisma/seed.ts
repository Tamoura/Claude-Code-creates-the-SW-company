/**
 * Pulse - Database Seed Script
 *
 * Generates realistic test data for local development.
 * Idempotent: can be run multiple times safely (upserts where possible,
 * deletes and recreates time-series data).
 *
 * Usage:
 *   npx prisma db seed
 *   -- or --
 *   npx tsx prisma/seed.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────

const SEED_DATE = new Date('2026-02-07T12:00:00Z');
const DAYS_OF_HISTORY = 90;
const START_DATE = new Date(SEED_DATE.getTime() - DAYS_OF_HISTORY * 24 * 60 * 60 * 1000);

// Deterministic seed for reproducible fake data
faker.seed(42);

// ──────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(SEED_DATE.getTime() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(SEED_DATE.getTime() - hours * 60 * 60 * 1000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

function randomTimeOnDay(date: Date): Date {
  const result = new Date(date);
  // Commits happen during work hours (8am-7pm) with some off-hours
  const isWorkHours = Math.random() < 0.85;
  if (isWorkHours) {
    result.setUTCHours(randomBetween(8, 19), randomBetween(0, 59), randomBetween(0, 59));
  } else {
    result.setUTCHours(randomBetween(20, 23), randomBetween(0, 59), randomBetween(0, 59));
  }
  return result;
}

function fakeSha(): string {
  return randomBytes(20).toString('hex');
}

function fakePasswordHash(): string {
  // Fake bcrypt hash (not a real hash, just for seed data shape)
  return '$2b$12$' + randomBytes(30).toString('base64').slice(0, 53);
}

function riskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekEnd(start: Date): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ──────────────────────────────────────────────────
// Seed Data Definitions
// ──────────────────────────────────────────────────

const TEST_USERS = [
  {
    email: 'admin@pulse.test',
    name: 'Alex Chen',
    githubUsername: 'alexchen-dev',
    role: 'ADMIN' as const,
    timezone: 'America/New_York',
  },
  {
    email: 'member@pulse.test',
    name: 'Priya Sharma',
    githubUsername: 'priya-dev',
    role: 'MEMBER' as const,
    timezone: 'America/Los_Angeles',
  },
  {
    email: 'viewer@pulse.test',
    name: 'Jordan Lee',
    githubUsername: 'jordanlee',
    role: 'VIEWER' as const,
    timezone: 'Europe/London',
  },
];

const ADDITIONAL_DEVELOPERS = [
  { name: 'Marcus Rivera', githubUsername: 'mrivera-eng' },
  { name: 'Sarah Kim', githubUsername: 'sarahk-code' },
  { name: 'David Okafor', githubUsername: 'dokafor' },
  { name: 'Emma Watson', githubUsername: 'ewatson-dev' },
  { name: 'Carlos Mendez', githubUsername: 'cmendez' },
];

const TEAM_DEFINITIONS = [
  {
    name: 'Platform Team',
    slug: 'platform-team',
    repos: [
      { name: 'backend-api', fullName: 'acme/backend-api', language: 'TypeScript', githubId: 100001n },
      { name: 'web-dashboard', fullName: 'acme/web-dashboard', language: 'TypeScript', githubId: 100002n },
      { name: 'shared-utils', fullName: 'acme/shared-utils', language: 'TypeScript', githubId: 100003n },
      { name: 'mobile-app', fullName: 'acme/mobile-app', language: 'TypeScript', githubId: 100004n },
    ],
  },
  {
    name: 'Data Team',
    slug: 'data-team',
    repos: [
      { name: 'data-pipeline', fullName: 'acme/data-pipeline', language: 'Python', githubId: 200001n },
      { name: 'ml-service', fullName: 'acme/ml-service', language: 'Python', githubId: 200002n },
      { name: 'analytics-api', fullName: 'acme/analytics-api', language: 'Go', githubId: 200003n },
    ],
  },
];

const PR_TITLE_TEMPLATES = [
  'Add {feature} endpoint',
  'Fix {bug} in {component}',
  'Refactor {component} for better performance',
  'Update {dependency} to latest version',
  'Implement {feature} UI component',
  'Add unit tests for {component}',
  'Fix race condition in {component}',
  'Add error handling for {feature}',
  'Improve {component} logging',
  'Migrate {component} to TypeScript',
  'Add pagination to {feature} list',
  'Fix memory leak in {component}',
  'Add caching for {feature} queries',
  'Implement retry logic for {component}',
  'Add input validation for {feature}',
];

const FEATURES = ['authentication', 'user profile', 'notifications', 'search', 'dashboard', 'settings', 'billing', 'analytics', 'exports', 'webhooks'];
const BUGS = ['null pointer', 'timeout', 'race condition', 'memory leak', 'incorrect calculation', 'missing validation'];
const COMPONENTS = ['auth service', 'API gateway', 'cache layer', 'queue processor', 'websocket handler', 'rate limiter', 'middleware'];
const DEPENDENCIES = ['prisma', 'fastify', 'react', 'tailwind', 'zod', 'jest', 'typescript'];

function generatePRTitle(): string {
  const template = faker.helpers.arrayElement(PR_TITLE_TEMPLATES);
  return template
    .replace('{feature}', faker.helpers.arrayElement(FEATURES))
    .replace('{bug}', faker.helpers.arrayElement(BUGS))
    .replace('{component}', faker.helpers.arrayElement(COMPONENTS))
    .replace('{dependency}', faker.helpers.arrayElement(DEPENDENCIES));
}

const COMMIT_MESSAGE_TEMPLATES = [
  'feat: add {feature}',
  'fix: resolve {bug}',
  'refactor: clean up {component}',
  'test: add tests for {component}',
  'docs: update {component} documentation',
  'chore: update dependencies',
  'style: fix linting issues',
  'perf: optimize {component} queries',
  'ci: update GitHub Actions workflow',
  'feat: implement {feature} validation',
];

function generateCommitMessage(): string {
  const template = faker.helpers.arrayElement(COMMIT_MESSAGE_TEMPLATES);
  return template
    .replace('{feature}', faker.helpers.arrayElement(FEATURES))
    .replace('{bug}', faker.helpers.arrayElement(BUGS))
    .replace('{component}', faker.helpers.arrayElement(COMPONENTS));
}

// ──────────────────────────────────────────────────
// Seed Functions
// ──────────────────────────────────────────────────

async function seedUsers(): Promise<string[]> {
  console.log('  Seeding users...');
  const userIds: string[] = [];

  for (const user of TEST_USERS) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        githubUsername: user.githubUsername,
        timezone: user.timezone,
        emailVerified: true,
      },
      create: {
        email: user.email,
        passwordHash: fakePasswordHash(),
        name: user.name,
        githubUsername: user.githubUsername,
        avatarUrl: `https://avatars.githubusercontent.com/u/${randomBetween(1000, 99999)}`,
        timezone: user.timezone,
        emailVerified: true,
      },
    });
    userIds.push(created.id);
  }

  console.log(`    Created ${userIds.length} users`);
  return userIds;
}

async function seedTeamsAndMembers(userIds: string[]): Promise<{ teamIds: string[]; repoMap: Map<string, string[]> }> {
  console.log('  Seeding teams and members...');
  const teamIds: string[] = [];
  const repoMap = new Map<string, string[]>();

  for (const teamDef of TEAM_DEFINITIONS) {
    const team = await prisma.team.upsert({
      where: { slug: teamDef.slug },
      update: { name: teamDef.name },
      create: {
        name: teamDef.name,
        slug: teamDef.slug,
        timezone: 'America/New_York',
      },
    });
    teamIds.push(team.id);

    // Add all test users to each team with their defined roles
    for (let i = 0; i < userIds.length; i++) {
      const existingMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: userIds[i], teamId: team.id } },
      });
      if (!existingMember) {
        await prisma.teamMember.create({
          data: {
            userId: userIds[i],
            teamId: team.id,
            role: TEST_USERS[i].role,
          },
        });
      }
    }

    // Seed repositories
    const repoIds: string[] = [];
    for (const repoDef of teamDef.repos) {
      const repo = await prisma.repository.upsert({
        where: {
          teamId_githubId: { teamId: team.id, githubId: repoDef.githubId },
        },
        update: {
          name: repoDef.name,
          fullName: repoDef.fullName,
          language: repoDef.language,
        },
        create: {
          teamId: team.id,
          githubId: repoDef.githubId,
          name: repoDef.name,
          fullName: repoDef.fullName,
          organization: 'acme',
          language: repoDef.language,
          defaultBranch: 'main',
          isPrivate: false,
          syncStatus: 'complete',
          syncProgress: 100,
          syncStartedAt: daysAgo(DAYS_OF_HISTORY),
          syncCompletedAt: daysAgo(DAYS_OF_HISTORY - 1),
          lastActivityAt: hoursAgo(1),
          connectedAt: daysAgo(DAYS_OF_HISTORY),
        },
      });
      repoIds.push(repo.id);
    }
    repoMap.set(team.id, repoIds);
  }

  console.log(`    Created ${teamIds.length} teams with repositories`);
  return { teamIds, repoMap };
}

async function seedCommits(repoMap: Map<string, string[]>): Promise<void> {
  console.log('  Seeding commits (90 days of history)...');
  let totalCommits = 0;

  const allDevelopers = [
    ...TEST_USERS.map(u => u.githubUsername),
    ...ADDITIONAL_DEVELOPERS.map(d => d.githubUsername),
  ];

  for (const [, repoIds] of repoMap) {
    for (const repoId of repoIds) {
      // Delete existing commits for idempotency
      await prisma.commit.deleteMany({ where: { repoId } });

      const commits: Prisma.CommitCreateManyInput[] = [];

      for (let day = 0; day < DAYS_OF_HISTORY; day++) {
        const date = daysAgo(DAYS_OF_HISTORY - day);
        const weekday = isWeekday(date);

        // Weekdays: 3-12 commits, Weekends: 0-3 commits
        const commitCount = weekday
          ? randomBetween(3, 12)
          : randomBetween(0, 3);

        for (let c = 0; c < commitCount; c++) {
          const author = faker.helpers.arrayElement(allDevelopers);
          const committedAt = randomTimeOnDay(date);
          const sha = fakeSha();

          commits.push({
            repoId,
            sha,
            message: generateCommitMessage(),
            authorGithubUsername: author,
            authorEmail: `${author}@users.noreply.github.com`,
            committedAt,
            additions: randomBetween(1, 300),
            deletions: randomBetween(0, 150),
            branch: faker.helpers.arrayElement(['main', 'develop', `feature/${faker.word.noun()}`]),
            url: `https://github.com/acme/repo/commit/${sha}`,
          });
        }
      }

      if (commits.length > 0) {
        await prisma.commit.createMany({ data: commits });
        totalCommits += commits.length;
      }
    }
  }

  console.log(`    Created ${totalCommits} commits`);
}

async function seedPullRequestsAndReviews(repoMap: Map<string, string[]>): Promise<void> {
  console.log('  Seeding pull requests and reviews...');
  let totalPRs = 0;
  let totalReviews = 0;

  const allDevelopers = [
    ...TEST_USERS.map(u => u.githubUsername),
    ...ADDITIONAL_DEVELOPERS.map(d => d.githubUsername),
  ];

  let globalPRNumber = 1;
  let globalGithubId = 500000n;
  let globalReviewGithubId = 900000n;

  for (const [, repoIds] of repoMap) {
    for (const repoId of repoIds) {
      // Delete existing PRs (cascades to reviews)
      await prisma.pullRequest.deleteMany({ where: { repoId } });

      for (let day = 0; day < DAYS_OF_HISTORY; day++) {
        const date = daysAgo(DAYS_OF_HISTORY - day);
        if (!isWeekday(date)) continue;

        // 0-3 PRs per weekday per repo
        const prCount = randomBetween(0, 3);

        for (let p = 0; p < prCount; p++) {
          const author = faker.helpers.arrayElement(allDevelopers);
          const createdAt = randomTimeOnDay(date);
          const prNumber = globalPRNumber++;
          const prGithubId = globalGithubId++;

          // Determine PR state and timing
          const daysSinceCreation = DAYS_OF_HISTORY - day;
          let state: 'open' | 'closed' | 'merged';
          let mergedAt: Date | null = null;
          let closedAt: Date | null = null;
          let firstReviewAt: Date | null = null;

          if (daysSinceCreation < 3) {
            // Recent PRs: some still open
            state = Math.random() < 0.6 ? 'open' : 'merged';
          } else {
            // Older PRs: mostly merged, some closed
            const roll = Math.random();
            if (roll < 0.8) state = 'merged';
            else if (roll < 0.95) state = 'closed';
            else state = 'open'; // Stalled PRs
          }

          // Cycle time: 2 hours to 5 days
          const cycleTimeHours = randomBetween(2, 120);
          const reviewTimeHours = Math.max(1, cycleTimeHours - randomBetween(1, Math.min(cycleTimeHours, 24)));

          if (state === 'merged' || state === 'closed') {
            const resolveTime = new Date(createdAt.getTime() + cycleTimeHours * 60 * 60 * 1000);
            if (resolveTime < SEED_DATE) {
              if (state === 'merged') mergedAt = resolveTime;
              closedAt = resolveTime;
            } else {
              state = 'open';
            }
          }

          // First review time
          if (state !== 'open' || Math.random() < 0.7) {
            const reviewDelay = reviewTimeHours * 60 * 60 * 1000;
            const reviewDate = new Date(createdAt.getTime() + reviewDelay);
            if (reviewDate < SEED_DATE) {
              firstReviewAt = reviewDate;
            }
          }

          const additions = randomBetween(5, 800);
          const deletions = randomBetween(0, Math.floor(additions * 0.6));

          const pr = await prisma.pullRequest.create({
            data: {
              repoId,
              githubId: prGithubId,
              number: prNumber,
              title: generatePRTitle(),
              state,
              authorGithubUsername: author,
              authorAvatarUrl: `https://avatars.githubusercontent.com/u/${randomBetween(1000, 99999)}`,
              additions,
              deletions,
              commitsCount: randomBetween(1, 15),
              isDraft: false,
              createdAt,
              updatedAt: closedAt || mergedAt || createdAt,
              mergedAt,
              closedAt,
              firstReviewAt,
              url: `https://github.com/acme/repo/pull/${prNumber}`,
            },
          });
          totalPRs++;

          // Create reviews for this PR
          if (firstReviewAt) {
            const reviewCount = randomBetween(1, 4);
            const reviewers = faker.helpers.arrayElements(
              allDevelopers.filter(d => d !== author),
              Math.min(reviewCount, allDevelopers.length - 1)
            );

            for (let r = 0; r < reviewers.length; r++) {
              const reviewGithubId = globalReviewGithubId++;
              const reviewSubmittedAt = new Date(
                firstReviewAt.getTime() + r * randomBetween(30, 480) * 60 * 1000
              );

              if (reviewSubmittedAt >= SEED_DATE) continue;

              const reviewStates: Array<'approved' | 'changes_requested' | 'commented'> = [
                'approved', 'changes_requested', 'commented',
              ];
              // Last review is usually an approval if PR is merged
              const reviewState = (r === reviewers.length - 1 && state === 'merged')
                ? 'approved'
                : faker.helpers.arrayElement(reviewStates);

              await prisma.review.create({
                data: {
                  prId: pr.id,
                  githubId: reviewGithubId,
                  reviewerGithubUsername: reviewers[r],
                  reviewerAvatarUrl: `https://avatars.githubusercontent.com/u/${randomBetween(1000, 99999)}`,
                  state: reviewState,
                  body: reviewState === 'approved'
                    ? faker.helpers.arrayElement(['LGTM!', 'Looks good to me.', 'Ship it!', 'Nice work!'])
                    : reviewState === 'changes_requested'
                      ? faker.helpers.arrayElement(['Please add tests.', 'Needs error handling.', 'Could you refactor this?'])
                      : faker.helpers.arrayElement(['Interesting approach.', 'Minor nit.', 'Question about this logic.']),
                  submittedAt: reviewSubmittedAt,
                  isBot: false,
                },
              });
              totalReviews++;
            }
          }
        }
      }
    }
  }

  console.log(`    Created ${totalPRs} pull requests with ${totalReviews} reviews`);
}

async function seedDeployments(repoMap: Map<string, string[]>): Promise<void> {
  console.log('  Seeding deployments...');
  let totalDeployments = 0;
  let globalDeployGithubId = 700000n;

  for (const [, repoIds] of repoMap) {
    for (const repoId of repoIds) {
      await prisma.deployment.deleteMany({ where: { repoId } });

      const deployments: Prisma.DeploymentCreateManyInput[] = [];

      for (let day = 0; day < DAYS_OF_HISTORY; day++) {
        const date = daysAgo(DAYS_OF_HISTORY - day);
        if (!isWeekday(date)) continue;

        // 0-2 deployments per weekday
        const deployCount = randomBetween(0, 2);

        for (let d = 0; d < deployCount; d++) {
          const deployTime = randomTimeOnDay(date);
          const sha = fakeSha();
          const deployGithubId = globalDeployGithubId++;

          // Staging deployment
          deployments.push({
            repoId,
            githubId: deployGithubId,
            environment: 'staging',
            status: 'success',
            commitSha: sha,
            description: `Deploy ${sha.slice(0, 7)} to staging`,
            url: `https://staging.acme.dev`,
            createdAt: deployTime,
            updatedAt: new Date(deployTime.getTime() + randomBetween(30, 300) * 1000),
          });

          // ~60% of staging deploys also go to production
          if (Math.random() < 0.6) {
            const prodTime = new Date(deployTime.getTime() + randomBetween(1, 4) * 60 * 60 * 1000);
            if (prodTime < SEED_DATE) {
              const prodGithubId = globalDeployGithubId++;
              const prodStatus = Math.random() < 0.95 ? 'success' : 'failure';
              deployments.push({
                repoId,
                githubId: prodGithubId,
                environment: 'production',
                status: prodStatus as 'success' | 'failure',
                commitSha: sha,
                description: `Deploy ${sha.slice(0, 7)} to production`,
                url: `https://acme.dev`,
                createdAt: prodTime,
                updatedAt: new Date(prodTime.getTime() + randomBetween(30, 300) * 1000),
              });
            }
          }
        }
      }

      if (deployments.length > 0) {
        await prisma.deployment.createMany({ data: deployments });
        totalDeployments += deployments.length;
      }
    }
  }

  console.log(`    Created ${totalDeployments} deployments`);
}

async function seedCoverageReports(repoMap: Map<string, string[]>): Promise<void> {
  console.log('  Seeding coverage reports...');
  let totalReports = 0;

  for (const [, repoIds] of repoMap) {
    for (const repoId of repoIds) {
      await prisma.coverageReport.deleteMany({ where: { repoId } });

      const reports: Prisma.CoverageReportCreateManyInput[] = [];
      // Start with a base coverage and drift over time
      let baseCoverage = randomBetween(65, 85);

      for (let day = 0; day < DAYS_OF_HISTORY; day++) {
        const date = daysAgo(DAYS_OF_HISTORY - day);
        if (!isWeekday(date)) continue;

        // 1-3 coverage reports per weekday (each merged PR triggers one)
        const reportCount = randomBetween(1, 3);
        for (let r = 0; r < reportCount; r++) {
          // Coverage drifts slightly: -0.5 to +0.8 per report
          baseCoverage = Math.max(40, Math.min(98, baseCoverage + (Math.random() * 1.3 - 0.5)));
          const coverage = Math.round(baseCoverage * 10) / 10;

          reports.push({
            repoId,
            commitSha: fakeSha(),
            coverage: new Prisma.Decimal(coverage),
            source: 'github_checks',
            reportedAt: randomTimeOnDay(date),
          });
        }
      }

      if (reports.length > 0) {
        await prisma.coverageReport.createMany({ data: reports });
        totalReports += reports.length;
      }
    }
  }

  console.log(`    Created ${totalReports} coverage reports`);
}

async function seedMetricSnapshots(teamIds: string[], repoMap: Map<string, string[]>): Promise<void> {
  console.log('  Seeding metric snapshots (weekly aggregates)...');
  let totalSnapshots = 0;

  const metricTypes: Array<'prs_merged' | 'median_cycle_time' | 'median_review_time' | 'test_coverage' | 'avg_pr_size' | 'review_comments_per_pr' | 'merge_without_approval_rate' | 'commit_count' | 'deployment_count'> = [
    'prs_merged',
    'median_cycle_time',
    'median_review_time',
    'test_coverage',
    'avg_pr_size',
    'review_comments_per_pr',
    'merge_without_approval_rate',
    'commit_count',
    'deployment_count',
  ];

  for (const teamId of teamIds) {
    // Delete existing snapshots for idempotency
    await prisma.metricSnapshot.deleteMany({ where: { teamId } });

    const snapshots: Prisma.MetricSnapshotCreateManyInput[] = [];
    const repoIds = repoMap.get(teamId) || [];

    // Generate weekly snapshots for 13 weeks (90 days)
    for (let week = 0; week < 13; week++) {
      const periodStart = weekStart(daysAgo((12 - week) * 7));
      const periodEnd = weekEnd(periodStart);

      if (periodEnd > SEED_DATE) continue;

      // Team-level snapshots (repo_id = null)
      for (const metric of metricTypes) {
        let value: number;
        switch (metric) {
          case 'prs_merged':
            value = randomBetween(8, 25);
            break;
          case 'median_cycle_time':
            // Hours (trending downward is good)
            value = randomBetween(12, 72);
            break;
          case 'median_review_time':
            // Hours
            value = randomBetween(2, 24);
            break;
          case 'test_coverage':
            value = randomBetween(70, 92);
            break;
          case 'avg_pr_size':
            // Lines changed
            value = randomBetween(80, 400);
            break;
          case 'review_comments_per_pr':
            value = Math.round((Math.random() * 4 + 0.5) * 10) / 10;
            break;
          case 'merge_without_approval_rate':
            // Percentage (lower is better)
            value = Math.round(Math.random() * 15 * 10) / 10;
            break;
          case 'commit_count':
            value = randomBetween(30, 120);
            break;
          case 'deployment_count':
            value = randomBetween(3, 15);
            break;
        }

        snapshots.push({
          teamId,
          repoId: null,
          metric,
          value: new Prisma.Decimal(value),
          periodStart,
          periodEnd,
          metadata: null,
          computedAt: periodEnd,
        });
      }

      // Repo-level snapshots for a subset of metrics
      const repoMetrics: typeof metricTypes = ['prs_merged', 'commit_count', 'test_coverage', 'deployment_count'];
      for (const repoId of repoIds) {
        for (const metric of repoMetrics) {
          let value: number;
          switch (metric) {
            case 'prs_merged':
              value = randomBetween(2, 8);
              break;
            case 'commit_count':
              value = randomBetween(10, 50);
              break;
            case 'test_coverage':
              value = randomBetween(65, 95);
              break;
            case 'deployment_count':
              value = randomBetween(1, 5);
              break;
            default:
              value = 0;
          }

          snapshots.push({
            teamId,
            repoId,
            metric,
            value: new Prisma.Decimal(value),
            periodStart,
            periodEnd,
            metadata: null,
            computedAt: periodEnd,
          });
        }
      }
    }

    if (snapshots.length > 0) {
      await prisma.metricSnapshot.createMany({ data: snapshots });
      totalSnapshots += snapshots.length;
    }
  }

  console.log(`    Created ${totalSnapshots} metric snapshots`);
}

async function seedRiskSnapshots(teamIds: string[]): Promise<void> {
  console.log('  Seeding risk snapshots...');
  let totalSnapshots = 0;

  for (const teamId of teamIds) {
    await prisma.riskSnapshot.deleteMany({ where: { teamId } });

    const snapshots: Prisma.RiskSnapshotCreateManyInput[] = [];
    let baseScore = randomBetween(25, 50);

    // Generate 3 snapshots per workday for 90 days (8am, 12pm, 4pm)
    for (let day = 0; day < DAYS_OF_HISTORY; day++) {
      const date = daysAgo(DAYS_OF_HISTORY - day);
      if (!isWeekday(date)) continue;

      for (const hour of [8, 12, 16]) {
        // Score drifts: -8 to +10 per snapshot
        baseScore = Math.max(5, Math.min(95, baseScore + randomBetween(-8, 10)));
        const level = riskLevel(baseScore);

        const factors = [
          {
            name: 'velocity_trend',
            value: Math.round(Math.random() * 100) / 100,
            impactScore: randomBetween(0, 30),
            weight: 0.25,
            trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
          },
          {
            name: 'pr_review_backlog',
            value: randomBetween(0, 8),
            impactScore: randomBetween(0, 25),
            weight: 0.20,
            trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
          },
          {
            name: 'cycle_time_trend',
            value: randomBetween(8, 72),
            impactScore: randomBetween(0, 20),
            weight: 0.15,
            trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
          },
          {
            name: 'commit_frequency',
            value: randomBetween(5, 50),
            impactScore: randomBetween(0, 15),
            weight: 0.15,
            trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
          },
          {
            name: 'test_coverage_delta',
            value: Math.round((Math.random() * 10 - 5) * 10) / 10,
            impactScore: randomBetween(0, 10),
            weight: 0.10,
            trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
          },
        ];

        const topFactors = factors
          .sort((a, b) => b.impactScore - a.impactScore)
          .slice(0, 3)
          .map(f => f.name.replace(/_/g, ' '));

        const explanation = `Sprint risk is ${baseScore} (${level}). Top factors: ${topFactors.join(', ')}.`;

        const recommendations = baseScore > 50
          ? [
              {
                action: 'Review stalled PRs to unblock team',
                priority: 'high',
                relatedFactor: 'pr_review_backlog',
              },
              {
                action: 'Break large PRs into smaller ones',
                priority: 'medium',
                relatedFactor: 'cycle_time_trend',
              },
            ]
          : null;

        const calculatedAt = new Date(date);
        calculatedAt.setUTCHours(hour, 0, 0, 0);

        if (calculatedAt < SEED_DATE) {
          snapshots.push({
            teamId,
            score: baseScore,
            level,
            explanation,
            factors,
            recommendations,
            calculatedAt,
          });
        }
      }
    }

    if (snapshots.length > 0) {
      await prisma.riskSnapshot.createMany({ data: snapshots });
      totalSnapshots += snapshots.length;
    }
  }

  console.log(`    Created ${totalSnapshots} risk snapshots`);
}

async function seedNotifications(userIds: string[]): Promise<void> {
  console.log('  Seeding notifications...');
  let totalNotifications = 0;

  const notificationTypes: Array<'pr_review_requested' | 'pr_reviewed' | 'pr_merged' | 'deployment' | 'anomaly' | 'risk_change'> = [
    'pr_review_requested',
    'pr_reviewed',
    'pr_merged',
    'deployment',
    'anomaly',
    'risk_change',
  ];

  for (const userId of userIds) {
    await prisma.notification.deleteMany({ where: { userId } });

    const notifications: Prisma.NotificationCreateManyInput[] = [];

    // Generate notifications for the last 30 days
    for (let day = 0; day < 30; day++) {
      const date = daysAgo(30 - day);
      if (!isWeekday(date)) continue;

      // 2-6 notifications per weekday
      const count = randomBetween(2, 6);
      for (let n = 0; n < count; n++) {
        const type = faker.helpers.arrayElement(notificationTypes);
        const notifTime = randomTimeOnDay(date);

        let title: string;
        let body: string;
        let data: Record<string, unknown> | null = null;

        switch (type) {
          case 'pr_review_requested':
            title = 'Review Requested';
            body = `${faker.helpers.arrayElement(ADDITIONAL_DEVELOPERS).name} requested your review on PR #${randomBetween(100, 500)}`;
            data = { repoId: 'repo-1', prNumber: randomBetween(100, 500) };
            break;
          case 'pr_reviewed':
            title = 'PR Reviewed';
            body = `${faker.helpers.arrayElement(ADDITIONAL_DEVELOPERS).name} approved your PR #${randomBetween(100, 500)}`;
            data = { repoId: 'repo-1', prNumber: randomBetween(100, 500) };
            break;
          case 'pr_merged':
            title = 'PR Merged';
            body = `PR #${randomBetween(100, 500)} has been merged to main`;
            data = { repoId: 'repo-1', prNumber: randomBetween(100, 500) };
            break;
          case 'deployment':
            title = 'Deployment Complete';
            body = `backend-api deployed to ${faker.helpers.arrayElement(['staging', 'production'])} successfully`;
            data = { repoId: 'repo-1', environment: 'production' };
            break;
          case 'anomaly':
            title = 'Anomaly Detected';
            body = `PR #${randomBetween(100, 500)} has been open for 48+ hours without review`;
            data = { repoId: 'repo-1', anomalyType: 'stalled_pr' };
            break;
          case 'risk_change':
            title = 'Risk Score Changed';
            body = `Sprint risk increased from ${randomBetween(30, 50)} to ${randomBetween(55, 80)}`;
            data = { teamId: 'team-1' };
            break;
        }

        notifications.push({
          userId,
          type,
          title,
          body,
          data,
          read: day > 3 ? true : Math.random() < 0.3,
          dismissed: day > 7 ? Math.random() < 0.5 : false,
          delivered: true,
          createdAt: notifTime,
        });
      }
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
      totalNotifications += notifications.length;
    }
  }

  console.log(`    Created ${totalNotifications} notifications`);
}

async function seedNotificationPreferences(userIds: string[]): Promise<void> {
  console.log('  Seeding notification preferences...');

  for (const userId of userIds) {
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        prReviewRequested: true,
        prReviewedMerged: true,
        deploymentEvents: true,
        anomalyAlerts: true,
        riskChanges: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        emailDigest: 'daily',
      },
    });
  }

  console.log(`    Created ${userIds.length} notification preference records`);
}

async function seedJobState(): Promise<void> {
  console.log('  Seeding job state...');

  const jobs = [
    { jobName: 'metric_aggregation', hoursAgo: 2 },
    { jobName: 'risk_calculation', hoursAgo: 5 },
    { jobName: 'anomaly_detection', hoursAgo: 0.33 },
    { jobName: 'github_sync', hoursAgo: 0.58 },
    { jobName: 'data_cleanup', hoursAgo: 25 },
  ];

  for (const job of jobs) {
    await prisma.jobState.upsert({
      where: { jobName: job.jobName },
      update: {
        lastProcessedAt: hoursAgo(job.hoursAgo),
        lastDurationMs: randomBetween(500, 15000),
        lastStatus: 'success',
      },
      create: {
        jobName: job.jobName,
        lastProcessedAt: hoursAgo(job.hoursAgo),
        lastDurationMs: randomBetween(500, 15000),
        lastStatus: 'success',
      },
    });
  }

  console.log('    Created 5 job state records');
}

async function seedAuditLogs(userIds: string[]): Promise<void> {
  console.log('  Seeding audit logs...');

  // Delete existing audit logs for clean seed
  await prisma.auditLog.deleteMany({});

  const actions = [
    { action: 'auth.login', resourceType: 'user' },
    { action: 'repo.connect', resourceType: 'repository' },
    { action: 'repo.disconnect', resourceType: 'repository' },
    { action: 'team.invite', resourceType: 'team' },
    { action: 'team.member_role_change', resourceType: 'team' },
    { action: 'settings.update', resourceType: 'user' },
    { action: 'notification.preferences_update', resourceType: 'user' },
  ];

  const logs: Prisma.AuditLogCreateManyInput[] = [];

  // Generate some audit logs for the last 30 days
  for (let day = 0; day < 30; day++) {
    const date = daysAgo(30 - day);
    const logCount = randomBetween(3, 10);

    for (let l = 0; l < logCount; l++) {
      const actionDef = faker.helpers.arrayElement(actions);
      const actor = faker.helpers.arrayElement(userIds);

      logs.push({
        actor,
        action: actionDef.action,
        resourceType: actionDef.resourceType,
        resourceId: faker.string.cuid(),
        details: { source: 'seed' },
        ip: faker.internet.ipv4(),
        userAgent: 'Mozilla/5.0 (seed-data)',
        timestamp: randomTimeOnDay(date),
      });
    }
  }

  if (logs.length > 0) {
    await prisma.auditLog.createMany({ data: logs });
  }

  console.log(`    Created ${logs.length} audit log entries`);
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('');
  console.log('===========================================');
  console.log('  Pulse - Database Seed');
  console.log('  Generating 90 days of realistic data...');
  console.log('===========================================');
  console.log('');

  const startTime = Date.now();

  // Phase 1: Core entities
  const userIds = await seedUsers();
  const { teamIds, repoMap } = await seedTeamsAndMembers(userIds);

  // Phase 2: Time-series data
  await seedCommits(repoMap);
  await seedPullRequestsAndReviews(repoMap);
  await seedDeployments(repoMap);
  await seedCoverageReports(repoMap);

  // Phase 3: Computed data
  await seedMetricSnapshots(teamIds, repoMap);
  await seedRiskSnapshots(teamIds);

  // Phase 4: User-facing data
  await seedNotifications(userIds);
  await seedNotificationPreferences(userIds);

  // Phase 5: System data
  await seedJobState();
  await seedAuditLogs(userIds);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('===========================================');
  console.log(`  Seed complete in ${elapsed}s`);
  console.log('');
  console.log('  Test Users:');
  console.log('    admin@pulse.test   (ADMIN)');
  console.log('    member@pulse.test  (MEMBER)');
  console.log('    viewer@pulse.test  (VIEWER)');
  console.log('');
  console.log('  Teams:');
  console.log('    Platform Team (4 repos)');
  console.log('    Data Team (3 repos)');
  console.log('===========================================');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
