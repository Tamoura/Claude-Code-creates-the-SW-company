import type { EgressRate } from '../types';

/**
 * Data egress (outbound transfer) pricing across all providers
 * Pricing data as of January 2025
 */
export const egressRates: EgressRate[] = [
  // AWS - Tiered pricing
  {
    providerId: 'aws',
    perGb: 0.09, // Base rate
    freeGbMonth: 100, // First 100GB free
    tiers: [
      { upToGb: 10240, perGb: 0.09 }, // First 10TB
      { upToGb: 51200, perGb: 0.085 }, // Next 40TB
      { upToGb: 153600, perGb: 0.07 }, // Next 100TB
      { upToGb: Infinity, perGb: 0.05 }, // Over 150TB
    ],
  },

  // GCP - Tiered pricing
  {
    providerId: 'gcp',
    perGb: 0.12,
    freeGbMonth: 1, // Very small free tier
    tiers: [
      { upToGb: 1024, perGb: 0.12 }, // First 1TB
      { upToGb: 10240, perGb: 0.11 }, // Next 9TB
      { upToGb: Infinity, perGb: 0.08 }, // Over 10TB
    ],
  },

  // Azure - Tiered pricing
  {
    providerId: 'azure',
    perGb: 0.087,
    freeGbMonth: 100,
    tiers: [
      { upToGb: 10240, perGb: 0.087 }, // First 10TB
      { upToGb: 51200, perGb: 0.083 }, // Next 40TB
      { upToGb: 153600, perGb: 0.07 }, // Next 100TB
      { upToGb: Infinity, perGb: 0.05 }, // Over 150TB
    ],
  },

  // Lambda Labs - Free egress!
  {
    providerId: 'lambda-labs',
    perGb: 0.0,
    freeGbMonth: Infinity,
  },

  // RunPod - Flat rate with small free tier
  {
    providerId: 'runpod',
    perGb: 0.10,
    freeGbMonth: 10,
  },

  // Vast.ai - Free egress (variable by host)
  {
    providerId: 'vast-ai',
    perGb: 0.0,
    freeGbMonth: Infinity,
  },

  // CoreWeave - Competitive flat rate
  {
    providerId: 'coreweave',
    perGb: 0.07,
    freeGbMonth: 50,
  },
];
