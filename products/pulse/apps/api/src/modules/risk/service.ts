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
import { generateCompletion, AIConfig } from '../../utils/ai-client.js';
import { loadConfig } from '../../config.js';
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

    let explanation: string;
    let recommendations: string[] = [];

    const config = loadConfig();
    if (config.openrouterApiKey) {
      try {
        const aiResult = await generateAIExplanation(
          { apiKey: config.openrouterApiKey, model: config.openrouterModel },
          score,
          level,
          factors
        );
        explanation = aiResult.explanation;
        recommendations = aiResult.recommendations;
      } catch (err) {
        logger.warn('AI explanation failed, using fallback', { error: String(err) });
        explanation = generateFallbackExplanation(score, level, factors);
      }
    } else {
      explanation = generateFallbackExplanation(score, level, factors);
    }

    await this.prisma.riskSnapshot.create({
      data: {
        teamId,
        score,
        level,
        explanation,
        recommendations: recommendations.length > 0
          ? JSON.stringify(recommendations)
          : undefined,
        factors: JSON.stringify(factors),
        calculatedAt: now,
      },
    });

    logger.info('Risk score computed', { teamId, score, level });

    return {
      score,
      level,
      explanation,
      recommendations,
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
// Pure functions (exported for testing)
// ────────────────────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score <= 33) return 'low';
  if (score <= 66) return 'medium';
  return 'high';
}

export function generateFallbackExplanation(
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

const SYSTEM_PROMPT = `You are a sprint risk analyst for a software development team. Analyze the risk factors and provide:
1. A concise explanation of the current sprint risk (2-3 sentences)
2. Actionable recommendations the team can take immediately

Respond in JSON format: { "explanation": "string", "recommendations": ["string"] }
Keep recommendations specific and actionable (3-5 items). Do not include markdown formatting.`;

export async function generateAIExplanation(
  config: AIConfig,
  score: number,
  level: string,
  factors: RiskFactor[]
): Promise<{ explanation: string; recommendations: string[] }> {
  const factorSummary = factors
    .map((f) => `- ${f.name}: score=${f.score}/100, weight=${(f.weight * 100).toFixed(0)}%, detail="${f.detail}"`)
    .join('\n');

  const userPrompt = `Sprint risk score: ${score}/100 (${level})

Risk factors:
${factorSummary}

Analyze these factors and provide your assessment.`;

  const raw = await generateCompletion(config, SYSTEM_PROMPT, userPrompt);

  const parsed = JSON.parse(raw);
  return {
    explanation: parsed.explanation || `Sprint risk is ${score} (${level}).`,
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [],
  };
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
