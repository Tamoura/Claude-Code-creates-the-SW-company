/**
 * Virality Scoring Engine
 *
 * Calculates composite virality scores for content using:
 * 1. Engagement Rate — likes+shares+comments relative to views/followers
 * 2. Velocity Score — how fast engagement is growing (snapshots over time)
 * 3. Share Ratio — shares are the strongest virality signal
 * 4. Platform-specific weights — each platform has different engagement norms
 */

interface EngagementData {
  likes: number;
  shares: number;
  comments: number;
  views: number;
  saves: number;
  authorFollowers: number | null;
  publishedAt: Date | null;
}

interface SnapshotPair {
  current: { likes: number; shares: number; comments: number; views: number };
  previous: { likes: number; shares: number; comments: number; views: number };
  hoursBetween: number;
}

// Platform-specific engagement rate benchmarks (median engagement rates)
const PLATFORM_BENCHMARKS: Record<string, { median: number; weight: Record<string, number> }> = {
  TWITTER: {
    median: 0.02,
    weight: { likes: 1, shares: 3, comments: 2, saves: 1.5 },
  },
  REDDIT: {
    median: 0.05,
    weight: { likes: 1, shares: 1.5, comments: 3, saves: 1 },
  },
  LINKEDIN: {
    median: 0.03,
    weight: { likes: 1, shares: 4, comments: 3, saves: 2 },
  },
  TIKTOK: {
    median: 0.08,
    weight: { likes: 1, shares: 5, comments: 2, saves: 3 },
  },
  YOUTUBE: {
    median: 0.04,
    weight: { likes: 1, shares: 3, comments: 2, saves: 2 },
  },
  INSTAGRAM: {
    median: 0.05,
    weight: { likes: 1, shares: 4, comments: 2, saves: 3 },
  },
  THREADS: {
    median: 0.03,
    weight: { likes: 1, shares: 3, comments: 2, saves: 1.5 },
  },
  BLUESKY: {
    median: 0.04,
    weight: { likes: 1, shares: 3, comments: 2, saves: 1 },
  },
  HACKERNEWS: {
    median: 0.1,
    weight: { likes: 2, shares: 1, comments: 4, saves: 1 },
  },
};

/**
 * Calculate weighted engagement score
 */
function weightedEngagement(data: EngagementData, platform: string): number {
  const weights = PLATFORM_BENCHMARKS[platform]?.weight ?? { likes: 1, shares: 3, comments: 2, saves: 1.5 };
  return (
    data.likes * weights.likes +
    data.shares * weights.shares +
    data.comments * weights.comments +
    data.saves * weights.saves
  );
}

/**
 * Calculate engagement rate (0-100 scale)
 */
export function calculateEngagementRate(data: EngagementData, platform: string): number {
  const benchmark = PLATFORM_BENCHMARKS[platform]?.median ?? 0.04;
  const denominator = data.views > 0 ? data.views : (data.authorFollowers ?? 1000);
  const totalEngagement = data.likes + data.shares + data.comments + data.saves;
  const rawRate = totalEngagement / Math.max(denominator, 1);

  // Normalize: how many times above/below benchmark
  const normalized = rawRate / benchmark;
  // Convert to 0-100 scale using logarithmic curve (diminishing returns at extreme values)
  return Math.min(100, Math.max(0, Math.log2(normalized + 1) * 25));
}

/**
 * Calculate velocity score — how fast engagement is growing (0-100 scale)
 */
export function calculateVelocityScore(snapshots: SnapshotPair | null): number {
  if (!snapshots || snapshots.hoursBetween <= 0) return 0;

  const { current, previous, hoursBetween } = snapshots;
  const currentTotal = current.likes + current.shares + current.comments + current.views;
  const previousTotal = previous.likes + previous.shares + previous.comments + previous.views;

  if (previousTotal === 0) return currentTotal > 100 ? 50 : 0;

  const growthRate = (currentTotal - previousTotal) / previousTotal;
  const hourlyGrowth = growthRate / hoursBetween;

  // Normalize: 100% hourly growth = score of 50, 1000% = ~80
  return Math.min(100, Math.max(0, Math.log10(hourlyGrowth * 100 + 1) * 25));
}

/**
 * Calculate age decay factor — newer content gets a boost
 */
function ageFactor(publishedAt: Date | null): number {
  if (!publishedAt) return 0.7;
  const hoursOld = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 1) return 1.0;
  if (hoursOld < 6) return 0.95;
  if (hoursOld < 24) return 0.85;
  if (hoursOld < 72) return 0.7;
  if (hoursOld < 168) return 0.5;
  return 0.3;
}

/**
 * Calculate composite virality score (0-100 scale)
 *
 * Formula:
 *   score = (engagementRate * 0.35 + velocityScore * 0.30 + shareRatio * 0.20 + weightedEng * 0.15) * ageFactor
 *
 * The score represents the percentile — 99+ means top 1%
 */
export function calculateViralityScore(
  data: EngagementData,
  platform: string,
  snapshots: SnapshotPair | null = null,
): { viralityScore: number; engagementRate: number; velocityScore: number } {
  const engagementRate = calculateEngagementRate(data, platform);
  const velocityScore = calculateVelocityScore(snapshots);

  // Share ratio: shares are the strongest virality signal
  const totalActions = data.likes + data.shares + data.comments + 1;
  const shareRatio = Math.min(100, (data.shares / totalActions) * 200);

  // Weighted engagement magnitude (absolute numbers matter too)
  const wEngagement = weightedEngagement(data, platform);
  const engMagnitude = Math.min(100, Math.log10(wEngagement + 1) * 20);

  const age = ageFactor(data.publishedAt);

  const viralityScore = Math.min(
    100,
    (engagementRate * 0.35 + velocityScore * 0.30 + shareRatio * 0.20 + engMagnitude * 0.15) * age,
  );

  return {
    viralityScore: Math.round(viralityScore * 100) / 100,
    engagementRate: Math.round(engagementRate * 100) / 100,
    velocityScore: Math.round(velocityScore * 100) / 100,
  };
}

/**
 * Determine the percentile rank within a platform
 * (Called after scoring a batch — requires distribution data)
 */
export function calculatePercentile(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 0;
  const sorted = [...allScores].sort((a, b) => a - b);
  const index = sorted.findIndex((s) => s >= score);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 10000) / 100;
}
