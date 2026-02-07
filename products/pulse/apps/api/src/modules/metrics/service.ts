import { PrismaClient, MetricType } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const PERIOD_MS: Record<string, number> = {
  '7d': 7 * 86400000,
  '30d': 30 * 86400000,
  '90d': 90 * 86400000,
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export class MetricsService {
  constructor(private prisma: PrismaClient) {}

  async getVelocity(teamId: string, period: string) {
    const periodMs = PERIOD_MS[period] || PERIOD_MS['30d'];
    const since = new Date(Date.now() - periodMs);

    // Get all repos for this team
    const repos = await this.prisma.repository.findMany({
      where: { teamId, disconnectedAt: null },
      select: { id: true },
    });
    const repoIds = repos.map((r) => r.id);

    if (repoIds.length === 0) {
      return {
        prsMerged: 0,
        medianCycleTimeHours: null,
        medianReviewTimeHours: null,
        period,
        since: since.toISOString(),
      };
    }

    // Get merged PRs in the period
    const mergedPrs = await this.prisma.pullRequest.findMany({
      where: {
        repoId: { in: repoIds },
        state: 'merged',
        mergedAt: { gte: since },
      },
      select: {
        createdAt: true,
        mergedAt: true,
        firstReviewAt: true,
      },
    });

    // Compute cycle times (PR created -> merged) in hours
    const cycleTimes = mergedPrs
      .filter((pr) => pr.mergedAt !== null)
      .map((pr) => {
        const created = pr.createdAt.getTime();
        const merged = pr.mergedAt!.getTime();
        return (merged - created) / 3600000;
      });

    // Compute review times (PR created -> first review) in hours
    const reviewTimes = mergedPrs
      .filter((pr) => pr.firstReviewAt !== null)
      .map((pr) => {
        const created = pr.createdAt.getTime();
        const reviewed = pr.firstReviewAt!.getTime();
        return (reviewed - created) / 3600000;
      });

    const medianCycleTime = median(cycleTimes);
    const medianReviewTime = median(reviewTimes);

    return {
      prsMerged: mergedPrs.length,
      medianCycleTimeHours: medianCycleTime
        ? Math.round(medianCycleTime * 10) / 10
        : null,
      medianReviewTimeHours: medianReviewTime
        ? Math.round(medianReviewTime * 10) / 10
        : null,
      period,
      since: since.toISOString(),
    };
  }

  async getCoverage(teamId: string, repoId?: string) {
    const where: any = { teamId, disconnectedAt: null };
    if (repoId) {
      where.id = repoId;
    }

    const repos = await this.prisma.repository.findMany({
      where,
      select: { id: true, name: true, fullName: true },
    });

    if (repos.length === 0) {
      return { repositories: [], teamAverage: null };
    }

    const results = [];
    const latestCoverages: number[] = [];

    for (const repo of repos) {
      // Get the two most recent coverage reports
      const reports = await this.prisma.coverageReport.findMany({
        where: { repoId: repo.id },
        orderBy: { reportedAt: 'desc' },
        take: 2,
        select: { coverage: true, reportedAt: true, commitSha: true },
      });

      if (reports.length === 0) continue;

      const latest = Number(reports[0].coverage);
      const previous =
        reports.length > 1 ? Number(reports[1].coverage) : null;
      latestCoverages.push(latest);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (previous !== null) {
        if (latest > previous) trend = 'up';
        else if (latest < previous) trend = 'down';
      }

      results.push({
        repoId: repo.id,
        repoName: repo.name,
        fullName: repo.fullName,
        latestCoverage: latest,
        previousCoverage: previous,
        trend,
        reportedAt: reports[0].reportedAt.toISOString(),
      });
    }

    const teamAverage =
      latestCoverages.length > 0
        ? Math.round(
            (latestCoverages.reduce((a, b) => a + b, 0) /
              latestCoverages.length) *
              10
          ) / 10
        : null;

    return { repositories: results, teamAverage };
  }

  async getSummary(teamId: string, period: string) {
    const periodMs = PERIOD_MS[period] || PERIOD_MS['30d'];
    const since = new Date(Date.now() - periodMs);

    const repos = await this.prisma.repository.findMany({
      where: { teamId, disconnectedAt: null },
      select: { id: true },
    });
    const repoIds = repos.map((r) => r.id);

    // Velocity
    const velocity = await this.getVelocity(teamId, period);

    // Coverage
    const coverage = await this.getCoverage(teamId);

    // Activity counts
    let commitCount = 0;
    let deploymentCount = 0;

    if (repoIds.length > 0) {
      commitCount = await this.prisma.commit.count({
        where: {
          repoId: { in: repoIds },
          committedAt: { gte: since },
        },
      });

      deploymentCount = await this.prisma.deployment.count({
        where: {
          repoId: { in: repoIds },
          createdAt: { gte: since },
        },
      });
    }

    return {
      velocity,
      coverage,
      activity: {
        commitCount,
        deploymentCount,
        period,
        since: since.toISOString(),
      },
    };
  }

  async runAggregation(teamId: string) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 86400000); // last 24h
    const periodEnd = now;

    const velocity = await this.getVelocity(teamId, '30d');
    const coverage = await this.getCoverage(teamId);

    const snapshots = [];

    // Store prs_merged
    snapshots.push({
      teamId,
      metric: MetricType.prs_merged,
      value: velocity.prsMerged,
      periodStart,
      periodEnd,
      metadata: { period: '30d' },
    });

    // Store median_cycle_time
    if (velocity.medianCycleTimeHours !== null) {
      snapshots.push({
        teamId,
        metric: MetricType.median_cycle_time,
        value: velocity.medianCycleTimeHours,
        periodStart,
        periodEnd,
        metadata: { period: '30d' },
      });
    }

    // Store median_review_time
    if (velocity.medianReviewTimeHours !== null) {
      snapshots.push({
        teamId,
        metric: MetricType.median_review_time,
        value: velocity.medianReviewTimeHours,
        periodStart,
        periodEnd,
        metadata: { period: '30d' },
      });
    }

    // Store test_coverage per repo
    for (const repo of coverage.repositories) {
      snapshots.push({
        teamId,
        repoId: repo.repoId,
        metric: MetricType.test_coverage,
        value: repo.latestCoverage,
        periodStart,
        periodEnd,
        metadata: {
          repoName: repo.repoName,
          trend: repo.trend,
        },
      });
    }

    // Batch create
    let created = 0;
    for (const snap of snapshots) {
      await this.prisma.metricSnapshot.create({ data: snap });
      created++;
    }

    logger.info('Metrics aggregation complete', {
      teamId,
      snapshotsCreated: created,
    });

    return { snapshotsCreated: created, periodStart, periodEnd };
  }
}
