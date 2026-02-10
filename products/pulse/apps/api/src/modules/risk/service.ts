import { PrismaClient, RiskLevel } from '@prisma/client';
import { RiskFactor, RiskResult, RiskHistoryResult } from './schemas.js';
import {
  computeVelocityTrend,
  computePrBacklog,
  computeCycleTimeTrend,
  computeCommitFrequencyDrop,
  computeCoverageDelta,
  computeLargePrRatio,
  computeReviewImbalance,
} from './factors.js';
import { logger } from '../../utils/logger.js';

const SPRINT_DAYS = 14;
const MS_PER_DAY = 86400000;

/**
 * Sprint Risk Scoring Service (ADR-003).
 *
 * Orchestrates 7 weighted risk factors, generates natural
 * language explanations, and persists risk snapshots.
 */
export class RiskService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compute the current sprint risk and store a snapshot.
   */
  async computeCurrentRisk(teamId: string): Promise<RiskResult> {
    const repoIds = await this.getTeamRepoIds(teamId);
    const now = new Date();
    const sprintStart = new Date(now.getTime() - SPRINT_DAYS * MS_PER_DAY);

    const factors = await this.computeAllFactors(repoIds, now, sprintStart);

    const rawScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0
    );
    const score = Math.min(Math.round(rawScore), 100);
    const level = scoreToLevel(score);
    const explanation = generateExplanation(score, level, factors);

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

    logger.info('Risk score computed', { teamId, score, level });

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
    const since = new Date(Date.now() - days * MS_PER_DAY);

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

  private async computeAllFactors(
    repoIds: string[],
    now: Date,
    sprintStart: Date
  ): Promise<RiskFactor[]> {
    if (repoIds.length === 0) {
      return emptyFactors();
    }

    const p = this.prisma;
    return Promise.all([
      computeVelocityTrend(p, repoIds, now, sprintStart),
      computePrBacklog(p, repoIds, now),
      computeCycleTimeTrend(p, repoIds, now),
      computeCommitFrequencyDrop(p, repoIds, now),
      computeCoverageDelta(p, repoIds, sprintStart, now),
      computeLargePrRatio(p, repoIds),
      computeReviewImbalance(p, repoIds, now, sprintStart),
    ]);
  }
}

// ────────────────────────────────────────
// Pure functions
// ────────────────────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score <= 33) return 'low';
  if (score <= 66) return 'medium';
  return 'high';
}

function generateExplanation(
  score: number,
  level: string,
  factors: RiskFactor[]
): string {
  if (score === 0) {
    return 'Sprint risk is 0 (low). No risk factors detected.';
  }

  const topFactors = [...factors]
    .map((f) => ({ ...f, contribution: f.score * f.weight }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  if (topFactors.length === 0) {
    return `Sprint risk is ${score} (${level}). No significant risk factors.`;
  }

  const details = topFactors
    .map((f) => `${f.name} (${f.detail})`)
    .join(', ');

  return `Sprint risk is ${score} (${level}). Top factors: ${details}.`;
}

function emptyFactors(): RiskFactor[] {
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
