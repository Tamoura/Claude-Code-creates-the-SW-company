import type { ProviderId } from '../types';
import { storageRates } from '../data';

/**
 * Calculate storage cost for a given provider
 * @param providerId Provider identifier
 * @param storageGb Total storage in GB
 * @param durationMonths Storage duration in months
 * @returns Total storage cost in USD
 */
export function calculateStorageCost(
  providerId: ProviderId,
  storageGb: number,
  durationMonths: number
): number {
  if (storageGb <= 0) return 0;

  const rate = storageRates.find((r) => r.providerId === providerId);
  if (!rate) return 0;

  // Apply free tier
  const chargedGb = Math.max(0, storageGb - rate.freeGbMonth);

  // Calculate monthly cost
  const monthlyCost = chargedGb * rate.perGbMonth;

  // Scale by duration
  return monthlyCost * durationMonths;
}
