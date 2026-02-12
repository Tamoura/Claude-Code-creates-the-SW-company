import crypto from 'crypto';

export interface ExperimentAssignment {
  variant: 'control' | 'variant';
  bucket: number;
}

/**
 * Deterministic experiment assignment using SHA-256 hash.
 * hash(userId + experimentId) mod 100 determines the bucket.
 * If bucket < trafficSplit, user is in control group.
 */
export function getExperimentAssignment(
  userId: string,
  experimentId: string,
  trafficSplit: number
): ExperimentAssignment {
  const input = `${userId}:${experimentId}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');

  // Take first 8 hex chars and convert to number, then mod 100
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;

  return {
    variant: bucket < trafficSplit ? 'control' : 'variant',
    bucket,
  };
}
