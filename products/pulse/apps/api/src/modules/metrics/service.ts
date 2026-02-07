import { PrismaClient, MetricType, Prisma } from '@prisma/client';
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

function roundToOneDp(value: number): number {
  return Math.round(value * 10) / 10;
}

function determineTrend(
  latest: number,
  previous: number | null
): 'up' | 'down' | 'stable' {
  if (previous === null) return 'stable';
  if (latest > previous) return 'up';
  if (latest < previous) return 'down';
  return 'stable';
}

export class MetricsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetch active repo IDs for a team.
   */
  private async getTeamRepoIds(teamId: string): Promise<string[]> {
    const repos = await this.prisma.repository.findMany({
      where: { teamId, disconnectedAt: null },
      select: { id: true },
    });
    return repos.map((r) => r.id);
  }

  /**
   * Compute velocity metrics: PR merge rate, cycle time, review time.
   */
  async getVelocity(teamId: string, period: string) {
    const periodMs = PERIOD_MS[period] || PERIOD_MS['30d'];
    const since = new Date(Date.now() - periodMs);
    const repoIds = await this.getTeamRepoIds(teamId);

    if (repoIds.length === 0) {
      return {
        prsMerged: 0,
        medianCycleTimeHours: null,
        medianReviewTimeHours: null,
        period,
        since: since.toISOString(),
      };
    }

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

    const cycleTimes = mergedPrs
      .filter((pr) => pr.mergedAt !== null)
      .map((pr) => {
        return (pr.mergedAt!.getTime() - pr.createdAt.getTime()) / 3600000;
      });

    const reviewTimes = mergedPrs
      .filter((pr) => pr.firstReviewAt !== null)
      .map((pr) => {
        return (pr.firstReviewAt!.getTime() - pr.createdAt.getTime()) / 3600000;
      });

    const medianCycleTime = median(cycleTimes);
    const medianReviewTime = median(reviewTimes);

    return {
      prsMerged: mergedPrs.length,
      medianCycleTimeHours: medianCycleTime !== null
        ? roundToOneDp(medianCycleTime)
        : null,
      medianReviewTimeHours: medianReviewTime !== null
        ? roundToOneDp(medianReviewTime)
        : null,
      period,
      since: since.toISOString(),
    };
  }

  /**
   * Compute test coverage per repo with trend direction.
   */
  async getCoverage(teamId: string, repoId?: string) {
    const where: Prisma.RepositoryWhereInput = {
      teamId,
      disconnectedAt: null,
    };
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

    // Fetch coverage for all repos in parallel
    const coveragePromises = repos.map(async (repo) => {
      const reports = await this.prisma.coverageReport.findMany({
        where: { repoId: repo.id },
        orderBy: { reportedAt: 'desc' },
        take: 2,
        select: { coverage: true, reportedAt: true },
      });

      if (reports.length === 0) return null;

      const latest = Number(reports[0].coverage);
      const previous = reports.length > 1 ? Number(reports[1].coverage) : null;

      return {
        repoId: repo.id,
        repoName: repo.name,
        fullName: repo.fullName,
        latestCoverage: latest,
        previousCoverage: previous,
        trend: determineTrend(latest, previous),
        reportedAt: reports[0].reportedAt.toISOString(),
      };
    });

    const results = (await Promise.all(coveragePromises)).filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    const latestCoverages = results.map((r) => r.latestCoverage);
    const teamAverage =
      latestCoverages.length > 0
        ? roundToOneDp(
            latestCoverages.reduce((a, b) => a + b, 0) / latestCoverages.length
          )
        : null;

    return { repositories: results, teamAverage };
  }

  /**
   * Aggregated summary combining velocity, coverage, and activity.
   */
  async getSummary(teamId: string, period: string) {
    const periodMs = PERIOD_MS[period] || PERIOD_MS['30d'];
    const since = new Date(Date.now() - periodMs);
    const repoIds = await this.getTeamRepoIds(teamId);

    // Run velocity, coverage, and activity counts in parallel
    const [velocity, coverage, commitCount, deploymentCount] =
      await Promise.all([
        this.getVelocity(teamId, period),
        this.getCoverage(teamId),
        repoIds.length > 0
          ? this.prisma.commit.count({
              where: {
                repoId: { in: repoIds },
                committedAt: { gte: since },
              },
            })
          : 0,
        repoIds.length > 0
          ? this.prisma.deployment.count({
              where: {
                repoId: { in: repoIds },
                createdAt: { gte: since },
              },
            })
          : 0,
      ]);

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

  /**
   * Compute and store metric snapshots for a team.
   * Designed to be called periodically (hourly/daily).
   */
  async runAggregation(teamId: string) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 86400000);
    const periodEnd = now;

    const [velocity, coverage] = await Promise.all([
      this.getVelocity(teamId, '30d'),
      this.getCoverage(teamId),
    ]);

    const snapshots: Prisma.MetricSnapshotCreateManyInput[] = [];

    snapshots.push({
      teamId,
      metric: MetricType.prs_merged,
      value: velocity.prsMerged,
      periodStart,
      periodEnd,
      metadata: { period: '30d' },
    });

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

    for (const repo of coverage.repositories) {
      snapshots.push({
        teamId,
        repoId: repo.repoId,
        metric: MetricType.test_coverage,
        value: repo.latestCoverage,
        periodStart,
        periodEnd,
        metadata: { repoName: repo.repoName, trend: repo.trend },
      });
    }

    const result = await this.prisma.metricSnapshot.createMany({
      data: snapshots,
    });

    logger.info('Metrics aggregation complete', {
      teamId,
      snapshotsCreated: result.count,
    });

    return {
      snapshotsCreated: result.count,
      periodStart,
      periodEnd,
    };
  }
}
