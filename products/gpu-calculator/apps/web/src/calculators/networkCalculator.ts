import type { ProviderId } from '../types';
import { egressRates } from '../data';

/**
 * Calculate egress (data transfer out) cost for a given provider
 * Applies free tier and tiered pricing if available
 * @param providerId Provider identifier
 * @param egressGb Total egress in GB
 * @returns Total egress cost in USD
 */
export function calculateEgressCost(
  providerId: ProviderId,
  egressGb: number
): number {
  if (egressGb <= 0) return 0;

  const rate = egressRates.find((r) => r.providerId === providerId);
  if (!rate) return 0;

  // Apply free tier
  let remainingGb = Math.max(0, egressGb - rate.freeGbMonth);
  if (remainingGb === 0) return 0;

  // If no tiers, use flat rate
  if (!rate.tiers || rate.tiers.length === 0) {
    return remainingGb * rate.perGb;
  }

  // Apply tiered pricing
  let totalCost = 0;
  let processed = 0;

  for (const tier of rate.tiers) {
    const tierSize = tier.upToGb - processed;
    const gbInThisTier = Math.min(remainingGb, tierSize);

    totalCost += gbInThisTier * tier.perGb;
    remainingGb -= gbInThisTier;
    processed += gbInThisTier;

    if (remainingGb <= 0) break;
  }

  return totalCost;
}
