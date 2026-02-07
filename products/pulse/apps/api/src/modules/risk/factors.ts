import { PrismaClient } from '@prisma/client';
import { RiskFactor } from './schemas.js';

/**
 * Individual risk factor computation functions.
 *
 * Each function queries the database for the relevant data
 * and returns a scored RiskFactor (0-100) with a detail string.
 */

const LARGE_PR_THRESHOLD = 500;
const MS_PER_DAY = 86400000;
const MS_PER_HOUR = 3600000;

// ────────────────────────────────────────
// Factor 1: Velocity Trend (weight 0.25)
// ────────────────────────────────────────

export async function computeVelocityTrend(
  prisma: PrismaClient,
  repoIds: string[],
  now: Date,
  sprintStart: Date
): Promise<RiskFactor> {
  const sprintDays = Math.max(
    1,
    (now.getTime() - sprintStart.getTime()) / MS_PER_DAY
  );

  const mergedCount = await prisma.pullRequest.count({
    where: {
      repoId: { in: repoIds },
      state: 'merged',
      mergedAt: { gte: sprintStart, lte: now },
    },
  });

  const fourWeeksAgo = new Date(now.getTime() - 28 * MS_PER_DAY);
  const historicalMerged = await prisma.pullRequest.count({
    where: {
      repoId: { in: repoIds },
      state: 'merged',
      mergedAt: { gte: fourWeeksAgo, lt: sprintStart },
    },
  });

  if (historicalMerged === 0) {
    return {
      name: 'Velocity Trend',
      score: 0,
      weight: 0.25,
      detail: `${mergedCount} PRs merged, no historical baseline`,
    };
  }

  const historicalDays = Math.max(
    1,
    (sprintStart.getTime() - fourWeeksAgo.getTime()) / MS_PER_DAY
  );
  const ratio = (mergedCount / sprintDays) / (historicalMerged / historicalDays);

  let score = 0;
  if (ratio < 0.7) {
    score = 100;
  } else if (ratio < 1.0) {
    score = Math.round(((1.0 - ratio) / 0.3) * 100);
  }

  return {
    name: 'Velocity Trend',
    score: clampScore(score),
    weight: 0.25,
    detail: `${mergedCount} PRs merged (${Math.round(ratio * 100)}% of average pace)`,
  };
}

// ────────────────────────────────────────
// Factor 2: PR Review Backlog (weight 0.20)
// ────────────────────────────────────────

export async function computePrBacklog(
  prisma: PrismaClient,
  repoIds: string[],
  now: Date
): Promise<RiskFactor> {
  const cutoff = new Date(now.getTime() - 24 * MS_PER_HOUR);

  const stalePrs = await prisma.pullRequest.count({
    where: {
      repoId: { in: repoIds },
      state: 'open',
      createdAt: { lte: cutoff },
      firstReviewAt: null,
    },
  });

  let score = 0;
  if (stalePrs > 3) {
    score = Math.round(((stalePrs - 3) / 3) * 100);
  } else if (stalePrs > 0) {
    score = Math.round((stalePrs / 3) * 30);
  }

  return {
    name: 'PR Review Backlog',
    score: clampScore(score),
    weight: 0.20,
    detail: `${stalePrs} PRs waiting >24h for review`,
  };
}

// ────────────────────────────────────────
// Factor 3: Cycle Time Trend (weight 0.15)
// ────────────────────────────────────────

export async function computeCycleTimeTrend(
  prisma: PrismaClient,
  repoIds: string[],
  now: Date
): Promise<RiskFactor> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const fourWeeksAgo = new Date(now.getTime() - 28 * MS_PER_DAY);

  const recentPrs = await prisma.pullRequest.findMany({
    where: {
      repoId: { in: repoIds },
      state: 'merged',
      mergedAt: { gte: sevenDaysAgo },
    },
    select: { createdAt: true, mergedAt: true },
  });

  const historicalPrs = await prisma.pullRequest.findMany({
    where: {
      repoId: { in: repoIds },
      state: 'merged',
      mergedAt: { gte: fourWeeksAgo, lt: sevenDaysAgo },
    },
    select: { createdAt: true, mergedAt: true },
  });

  if (recentPrs.length === 0 || historicalPrs.length === 0) {
    return {
      name: 'Cycle Time Trend',
      score: 0,
      weight: 0.15,
      detail: 'Insufficient data for comparison',
    };
  }

  const recentMedian = medianCycleTime(recentPrs);
  const historicalMedian = medianCycleTime(historicalPrs);

  if (historicalMedian === 0) {
    return {
      name: 'Cycle Time Trend',
      score: 0,
      weight: 0.15,
      detail: 'No historical cycle time baseline',
    };
  }

  const ratio = recentMedian / historicalMedian;
  let score = 0;
  if (ratio > 1.5) {
    score = 100;
  } else if (ratio > 1.0) {
    score = Math.round(((ratio - 1.0) / 0.5) * 100);
  }

  return {
    name: 'Cycle Time Trend',
    score: clampScore(score),
    weight: 0.15,
    detail: `Cycle time at ${Math.round(ratio * 100)}% of 4-week average`,
  };
}

// ────────────────────────────────────────
// Factor 4: Commit Frequency Drop (weight 0.15)
// ────────────────────────────────────────

export async function computeCommitFrequencyDrop(
  prisma: PrismaClient,
  repoIds: string[],
  now: Date
): Promise<RiskFactor> {
  const yesterday = new Date(now.getTime() - MS_PER_DAY);
  const dayBefore = new Date(now.getTime() - 2 * MS_PER_DAY);

  const yesterdayCommits = await prisma.commit.count({
    where: {
      repoId: { in: repoIds },
      committedAt: { gte: yesterday, lte: now },
    },
  });

  const dayBeforeCommits = await prisma.commit.count({
    where: {
      repoId: { in: repoIds },
      committedAt: { gte: dayBefore, lt: yesterday },
    },
  });

  if (dayBeforeCommits === 0) {
    return {
      name: 'Commit Frequency Drop',
      score: 0,
      weight: 0.15,
      detail: 'No prior day baseline',
    };
  }

  const dropPct =
    ((dayBeforeCommits - yesterdayCommits) / dayBeforeCommits) * 100;

  let score = 0;
  if (dropPct > 40) {
    score = Math.round(((dropPct - 40) / 60) * 100);
  }

  return {
    name: 'Commit Frequency Drop',
    score: clampScore(score),
    weight: 0.15,
    detail: dropPct > 0
      ? `${Math.round(dropPct)}% drop in commits day-over-day`
      : 'No drop in commit frequency',
  };
}

// ────────────────────────────────────────
// Factor 5: Test Coverage Delta (weight 0.10)
// ────────────────────────────────────────

export async function computeCoverageDelta(
  prisma: PrismaClient,
  repoIds: string[],
  sprintStart: Date,
  now: Date
): Promise<RiskFactor> {
  let totalStart = 0;
  let totalLatest = 0;
  let count = 0;

  for (const repoId of repoIds) {
    const startReport = await prisma.coverageReport.findFirst({
      where: {
        repoId,
        reportedAt: {
          gte: new Date(sprintStart.getTime() - 3 * MS_PER_DAY),
          lte: new Date(sprintStart.getTime() + 3 * MS_PER_DAY),
        },
      },
      orderBy: { reportedAt: 'asc' },
      select: { coverage: true },
    });

    const latestReport = await prisma.coverageReport.findFirst({
      where: { repoId },
      orderBy: { reportedAt: 'desc' },
      select: { coverage: true },
    });

    if (startReport && latestReport) {
      totalStart += Number(startReport.coverage);
      totalLatest += Number(latestReport.coverage);
      count++;
    }
  }

  if (count === 0) {
    return {
      name: 'Test Coverage Delta',
      score: 0,
      weight: 0.10,
      detail: 'No coverage data',
    };
  }

  const delta = (totalStart / count) - (totalLatest / count);
  let score = 0;
  if (delta > 3) {
    score = Math.round(((delta - 3) / 7) * 100);
  }

  const deltaStr = delta > 0
    ? `${delta.toFixed(1)}% decrease`
    : `${Math.abs(delta).toFixed(1)}% increase`;

  return {
    name: 'Test Coverage Delta',
    score: clampScore(score),
    weight: 0.10,
    detail: `Coverage ${deltaStr} since sprint start`,
  };
}

// ────────────────────────────────────────
// Factor 6: Large PR Ratio (weight 0.10)
// ────────────────────────────────────────

export async function computeLargePrRatio(
  prisma: PrismaClient,
  repoIds: string[]
): Promise<RiskFactor> {
  const openPrs = await prisma.pullRequest.findMany({
    where: { repoId: { in: repoIds }, state: 'open' },
    select: { additions: true, deletions: true },
  });

  if (openPrs.length === 0) {
    return {
      name: 'Large PR Ratio',
      score: 0,
      weight: 0.10,
      detail: 'No open PRs',
    };
  }

  const largePrs = openPrs.filter(
    (pr) => pr.additions + pr.deletions > LARGE_PR_THRESHOLD
  );
  const ratio = largePrs.length / openPrs.length;

  let score = 0;
  if (ratio > 0.3) {
    score = Math.round(((ratio - 0.3) / 0.5) * 100);
  }

  return {
    name: 'Large PR Ratio',
    score: clampScore(score),
    weight: 0.10,
    detail: `${largePrs.length} of ${openPrs.length} open PRs are >500 lines (${Math.round(ratio * 100)}%)`,
  };
}

// ────────────────────────────────────────
// Factor 7: Review Load Imbalance (weight 0.05)
// ────────────────────────────────────────

export async function computeReviewImbalance(
  prisma: PrismaClient,
  repoIds: string[],
  now: Date,
  sprintStart: Date
): Promise<RiskFactor> {
  const prIds = await prisma.pullRequest.findMany({
    where: { repoId: { in: repoIds } },
    select: { id: true },
  });

  if (prIds.length === 0) {
    return {
      name: 'Review Load Imbalance',
      score: 0,
      weight: 0.05,
      detail: 'No PRs to review',
    };
  }

  const reviews = await prisma.review.findMany({
    where: {
      prId: { in: prIds.map((p) => p.id) },
      submittedAt: { gte: sprintStart, lte: now },
      isBot: false,
    },
    select: { reviewerGithubUsername: true },
  });

  if (reviews.length === 0) {
    return {
      name: 'Review Load Imbalance',
      score: 0,
      weight: 0.05,
      detail: 'No reviews in sprint',
    };
  }

  const reviewCounts = new Map<string, number>();
  for (const review of reviews) {
    const prev = reviewCounts.get(review.reviewerGithubUsername) || 0;
    reviewCounts.set(review.reviewerGithubUsername, prev + 1);
  }

  const counts = Array.from(reviewCounts.values());
  if (counts.length < 2) {
    return {
      name: 'Review Load Imbalance',
      score: 0,
      weight: 0.05,
      detail: 'Only one reviewer active',
    };
  }

  const maxReviews = Math.max(...counts);
  const minReviews = Math.min(...counts);
  const ratio = minReviews === 0 ? maxReviews : maxReviews / minReviews;

  let score = 0;
  if (ratio > 3) {
    score = Math.round(((ratio - 3) / 7) * 100);
  }

  return {
    name: 'Review Load Imbalance',
    score: clampScore(score),
    weight: 0.05,
    detail: `Review ratio ${ratio.toFixed(1)}:1 (max ${maxReviews}, min ${minReviews})`,
  };
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

/** Clamp a score to [0, 100]. */
function clampScore(score: number): number {
  return Math.max(0, Math.min(score, 100));
}

/** Compute median cycle time in milliseconds from PR data. */
function medianCycleTime(
  prs: Array<{ createdAt: Date; mergedAt: Date | null }>
): number {
  const times = prs
    .filter((pr) => pr.mergedAt !== null)
    .map((pr) => pr.mergedAt!.getTime() - pr.createdAt.getTime());

  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
