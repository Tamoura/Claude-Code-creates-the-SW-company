import { PrismaClient, RiskLevel } from '@prisma/client';
import { RiskFactor, RiskResult, RiskHistoryResult } from './schemas.js';
import { logger } from '../../utils/logger.js';

/**
 * Sprint Risk Scoring Algorithm (ADR-003).
 *
 * 7 weighted factors scored 0-100. Weighted sum capped at 100.
 *
 * | Factor                  | Weight |
 * |-------------------------|--------|
 * | Velocity Trend          | 0.25   |
 * | PR Review Backlog       | 0.20   |
 * | Cycle Time Trend        | 0.15   |
 * | Commit Frequency Drop   | 0.15   |
 * | Test Coverage Delta     | 0.10   |
 * | Large PR Ratio          | 0.10   |
 * | Review Load Imbalance   | 0.05   |
 */
export class RiskService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compute the current sprint risk for a team and store a snapshot.
   */
  async computeCurrentRisk(teamId: string): Promise<RiskResult> {
    const repoIds = await this.getTeamRepoIds(teamId);
    const now = new Date();
    const sprintWindow = 14 * 86400000; // 14-day sprint
    const sprintStart = new Date(now.getTime() - sprintWindow);

    const factors = await this.computeAllFactors(
      teamId,
      repoIds,
      now,
      sprintStart
    );

    const rawScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0
    );
    const score = Math.min(Math.round(rawScore), 100);
    const level = this.scoreToLevel(score);
    const explanation = this.generateExplanation(score, level, factors);

    // Store snapshot
    await this.prisma.riskSnapshot.create({
      data: {
        teamId,
        score,
        level,
        explanation,
        factors: JSON.stringify(factors),
        calculatedAt: now,
      },
    });

    logger.info('Risk score computed', {
      teamId,
      score,
      level,
    });

    return {
      score,
      level,
      explanation,
      factors,
      calculatedAt: now.toISOString(),
    };
  }

  /**
   * Retrieve historical risk snapshots for a team.
   */
  async getHistory(
    teamId: string,
    days: number
  ): Promise<RiskHistoryResult> {
    const since = new Date(Date.now() - days * 86400000);

    const snapshots = await this.prisma.riskSnapshot.findMany({
      where: {
        teamId,
        calculatedAt: { gte: since },
      },
      orderBy: { calculatedAt: 'desc' },
      select: {
        id: true,
        score: true,
        level: true,
        explanation: true,
        factors: true,
        calculatedAt: true,
      },
    });

    return {
      teamId,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        score: s.score,
        level: s.level,
        explanation: s.explanation,
        factors: typeof s.factors === 'string'
          ? JSON.parse(s.factors as string)
          : s.factors,
        calculatedAt: s.calculatedAt.toISOString(),
      })),
    };
  }

  // ────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────

  private async getTeamRepoIds(teamId: string): Promise<string[]> {
    const repos = await this.prisma.repository.findMany({
      where: { teamId, disconnectedAt: null },
      select: { id: true },
    });
    return repos.map((r) => r.id);
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score <= 33) return 'low';
    if (score <= 66) return 'medium';
    return 'high';
  }

  private generateExplanation(
    score: number,
    level: string,
    factors: RiskFactor[]
  ): string {
    if (score === 0) {
      return `Sprint risk is 0 (low). No risk factors detected.`;
    }

    // Get top 3 contributing factors (by weighted contribution)
    const sorted = [...factors]
      .map((f) => ({ ...f, contribution: f.score * f.weight }))
      .filter((f) => f.score > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);

    if (sorted.length === 0) {
      return `Sprint risk is ${score} (${level}). No significant risk factors.`;
    }

    const details = sorted
      .map((f) => `${f.name} (${f.detail})`)
      .join(', ');

    return `Sprint risk is ${score} (${level}). Top factors: ${details}.`;
  }

  /**
   * Compute all 7 risk factors in parallel.
   */
  private async computeAllFactors(
    teamId: string,
    repoIds: string[],
    now: Date,
    sprintStart: Date
  ): Promise<RiskFactor[]> {
    if (repoIds.length === 0) {
      return this.emptyFactors();
    }

    const [
      velocityTrend,
      prBacklog,
      cycleTimeTrend,
      commitFrequencyDrop,
      coverageDelta,
      largePrRatio,
      reviewImbalance,
    ] = await Promise.all([
      this.computeVelocityTrend(repoIds, now, sprintStart),
      this.computePrBacklog(repoIds, now),
      this.computeCycleTimeTrend(repoIds, now),
      this.computeCommitFrequencyDrop(repoIds, now, sprintStart),
      this.computeCoverageDelta(repoIds, sprintStart, now),
      this.computeLargePrRatio(repoIds),
      this.computeReviewImbalance(repoIds, now, sprintStart),
    ]);

    return [
      velocityTrend,
      prBacklog,
      cycleTimeTrend,
      commitFrequencyDrop,
      coverageDelta,
      largePrRatio,
      reviewImbalance,
    ];
  }

  private emptyFactors(): RiskFactor[] {
    return [
      { name: 'Velocity Trend', score: 0, weight: 0.25, detail: 'No data' },
      { name: 'PR Review Backlog', score: 0, weight: 0.20, detail: 'No data' },
      { name: 'Cycle Time Trend', score: 0, weight: 0.15, detail: 'No data' },
      { name: 'Commit Frequency Drop', score: 0, weight: 0.15, detail: 'No data' },
      { name: 'Test Coverage Delta', score: 0, weight: 0.10, detail: 'No data' },
      { name: 'Large PR Ratio', score: 0, weight: 0.10, detail: 'No data' },
      { name: 'Review Load Imbalance', score: 0, weight: 0.05, detail: 'No data' },
    ];
  }

  /**
   * Factor 1: Velocity Trend (weight 0.25)
   * Concern: <70% of sprint average pace.
   */
  private async computeVelocityTrend(
    repoIds: string[],
    now: Date,
    sprintStart: Date
  ): Promise<RiskFactor> {
    const sprintDays = Math.max(
      1,
      (now.getTime() - sprintStart.getTime()) / 86400000
    );

    // Count merged PRs in this sprint
    const mergedCount = await this.prisma.pullRequest.count({
      where: {
        repoId: { in: repoIds },
        state: 'merged',
        mergedAt: { gte: sprintStart, lte: now },
      },
    });

    // Get the 4-week historical average for comparison
    const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);
    const historicalMerged = await this.prisma.pullRequest.count({
      where: {
        repoId: { in: repoIds },
        state: 'merged',
        mergedAt: { gte: fourWeeksAgo, lt: sprintStart },
      },
    });

    const historicalDays = Math.max(
      1,
      (sprintStart.getTime() - fourWeeksAgo.getTime()) / 86400000
    );
    const historicalRate = historicalMerged / historicalDays;
    const currentRate = mergedCount / sprintDays;

    // If no historical data, no trend to compare
    if (historicalMerged === 0) {
      return {
        name: 'Velocity Trend',
        score: 0,
        weight: 0.25,
        detail: `${mergedCount} PRs merged, no historical baseline`,
      };
    }

    const ratio = currentRate / historicalRate;
    // <70% of average pace = full concern (score 100)
    // 70-100% = proportional score
    // >= 100% = no concern
    let score = 0;
    if (ratio < 0.7) {
      score = 100;
    } else if (ratio < 1.0) {
      score = Math.round(((1.0 - ratio) / 0.3) * 100);
    }

    const pctOfAvg = Math.round(ratio * 100);
    return {
      name: 'Velocity Trend',
      score: Math.min(score, 100),
      weight: 0.25,
      detail: `${mergedCount} PRs merged (${pctOfAvg}% of average pace)`,
    };
  }

  /**
   * Factor 2: PR Review Backlog (weight 0.20)
   * Concern: >3 PRs open >24h without review.
   */
  private async computePrBacklog(
    repoIds: string[],
    now: Date
  ): Promise<RiskFactor> {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);

    // Open PRs created more than 24h ago without first review
    const stalePrs = await this.prisma.pullRequest.count({
      where: {
        repoId: { in: repoIds },
        state: 'open',
        createdAt: { lte: twentyFourHoursAgo },
        firstReviewAt: null,
      },
    });

    // Threshold: 3 PRs
    let score = 0;
    if (stalePrs > 3) {
      // Scale: 4 stale = ~50, 6+ = 100
      score = Math.min(Math.round(((stalePrs - 3) / 3) * 100), 100);
    } else if (stalePrs > 0) {
      // Below threshold but present: minor concern
      score = Math.round((stalePrs / 3) * 30);
    }

    return {
      name: 'PR Review Backlog',
      score: Math.min(score, 100),
      weight: 0.20,
      detail: `${stalePrs} PRs waiting >24h for review`,
    };
  }

  /**
   * Factor 3: Cycle Time Trend (weight 0.15)
   * Concern: >150% of 4-week average.
   */
  private async computeCycleTimeTrend(
    repoIds: string[],
    now: Date
  ): Promise<RiskFactor> {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);

    // Recent cycle times (last 7 days)
    const recentPrs = await this.prisma.pullRequest.findMany({
      where: {
        repoId: { in: repoIds },
        state: 'merged',
        mergedAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, mergedAt: true },
    });

    // Historical cycle times (4 weeks, excluding last 7 days)
    const historicalPrs = await this.prisma.pullRequest.findMany({
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

    const recentMedian = this.medianCycleTime(recentPrs);
    const historicalMedian = this.medianCycleTime(historicalPrs);

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

    const pct = Math.round(ratio * 100);
    return {
      name: 'Cycle Time Trend',
      score: Math.min(score, 100),
      weight: 0.15,
      detail: `Cycle time at ${pct}% of 4-week average`,
    };
  }

  /**
   * Factor 4: Commit Frequency Drop (weight 0.15)
   * Concern: >40% drop day-over-day.
   */
  private async computeCommitFrequencyDrop(
    repoIds: string[],
    now: Date,
    sprintStart: Date
  ): Promise<RiskFactor> {
    const yesterday = new Date(now.getTime() - 86400000);
    const dayBefore = new Date(now.getTime() - 2 * 86400000);

    // Commits yesterday
    const yesterdayCommits = await this.prisma.commit.count({
      where: {
        repoId: { in: repoIds },
        committedAt: { gte: yesterday, lte: now },
      },
    });

    // Commits the day before
    const dayBeforeCommits = await this.prisma.commit.count({
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
      // Scale from 40% drop to 100% drop
      score = Math.min(
        Math.round(((dropPct - 40) / 60) * 100),
        100
      );
    }

    return {
      name: 'Commit Frequency Drop',
      score: Math.min(score, 100),
      weight: 0.15,
      detail:
        dropPct > 0
          ? `${Math.round(dropPct)}% drop in commits day-over-day`
          : 'No drop in commit frequency',
    };
  }

  /**
   * Factor 5: Test Coverage Delta (weight 0.10)
   * Concern: >3% decrease from sprint start.
   */
  private async computeCoverageDelta(
    repoIds: string[],
    sprintStart: Date,
    now: Date
  ): Promise<RiskFactor> {
    if (repoIds.length === 0) {
      return {
        name: 'Test Coverage Delta',
        score: 0,
        weight: 0.10,
        detail: 'No repositories',
      };
    }

    // Get earliest coverage near sprint start for each repo
    // and latest coverage
    let totalStartCoverage = 0;
    let totalLatestCoverage = 0;
    let reposWithCoverage = 0;

    for (const repoId of repoIds) {
      const startReport = await this.prisma.coverageReport.findFirst({
        where: {
          repoId,
          reportedAt: {
            gte: new Date(sprintStart.getTime() - 3 * 86400000),
            lte: new Date(sprintStart.getTime() + 3 * 86400000),
          },
        },
        orderBy: { reportedAt: 'asc' },
        select: { coverage: true },
      });

      const latestReport = await this.prisma.coverageReport.findFirst({
        where: { repoId },
        orderBy: { reportedAt: 'desc' },
        select: { coverage: true },
      });

      if (startReport && latestReport) {
        totalStartCoverage += Number(startReport.coverage);
        totalLatestCoverage += Number(latestReport.coverage);
        reposWithCoverage++;
      }
    }

    if (reposWithCoverage === 0) {
      return {
        name: 'Test Coverage Delta',
        score: 0,
        weight: 0.10,
        detail: 'No coverage data',
      };
    }

    const avgStart = totalStartCoverage / reposWithCoverage;
    const avgLatest = totalLatestCoverage / reposWithCoverage;
    const delta = avgStart - avgLatest;

    let score = 0;
    if (delta > 3) {
      // Scale: 3% drop = score starts, 10% drop = 100
      score = Math.min(Math.round(((delta - 3) / 7) * 100), 100);
    }

    const deltaStr = delta > 0
      ? `${delta.toFixed(1)}% decrease`
      : `${Math.abs(delta).toFixed(1)}% increase`;

    return {
      name: 'Test Coverage Delta',
      score: Math.min(score, 100),
      weight: 0.10,
      detail: `Coverage ${deltaStr} since sprint start`,
    };
  }

  /**
   * Factor 6: Large PR Ratio (weight 0.10)
   * Concern: >30% of open PRs are >500 lines.
   */
  private async computeLargePrRatio(
    repoIds: string[]
  ): Promise<RiskFactor> {
    const openPrs = await this.prisma.pullRequest.findMany({
      where: {
        repoId: { in: repoIds },
        state: 'open',
      },
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
      (pr) => pr.additions + pr.deletions > 500
    );
    const ratio = largePrs.length / openPrs.length;

    let score = 0;
    if (ratio > 0.3) {
      // Scale: 30% = score starts, 80% = 100
      score = Math.min(
        Math.round(((ratio - 0.3) / 0.5) * 100),
        100
      );
    }

    const pct = Math.round(ratio * 100);
    return {
      name: 'Large PR Ratio',
      score: Math.min(score, 100),
      weight: 0.10,
      detail: `${largePrs.length} of ${openPrs.length} open PRs are >500 lines (${pct}%)`,
    };
  }

  /**
   * Factor 7: Review Load Imbalance (weight 0.05)
   * Concern: max/min reviews per person ratio >3:1.
   */
  private async computeReviewImbalance(
    repoIds: string[],
    now: Date,
    sprintStart: Date
  ): Promise<RiskFactor> {
    // Get all reviews in sprint window grouped by reviewer
    const prIds = await this.prisma.pullRequest.findMany({
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

    const reviews = await this.prisma.review.findMany({
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

    // Count reviews per reviewer
    const reviewCounts = new Map<string, number>();
    for (const review of reviews) {
      const count = reviewCounts.get(review.reviewerGithubUsername) || 0;
      reviewCounts.set(review.reviewerGithubUsername, count + 1);
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
      // Scale: 3:1 = score starts, 10:1 = 100
      score = Math.min(
        Math.round(((ratio - 3) / 7) * 100),
        100
      );
    }

    return {
      name: 'Review Load Imbalance',
      score: Math.min(score, 100),
      weight: 0.05,
      detail: `Review ratio ${ratio.toFixed(1)}:1 (max ${maxReviews}, min ${minReviews})`,
    };
  }

  private medianCycleTime(
    prs: Array<{ createdAt: Date; mergedAt: Date | null }>
  ): number {
    const cycleTimes = prs
      .filter((pr) => pr.mergedAt !== null)
      .map((pr) => pr.mergedAt!.getTime() - pr.createdAt.getTime());

    if (cycleTimes.length === 0) return 0;
    const sorted = [...cycleTimes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}
