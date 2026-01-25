import type { StorageRate } from '../types';

/**
 * Storage pricing across all providers
 * Pricing data as of January 2025
 * Focuses on object storage (S3-compatible)
 */
export const storageRates: StorageRate[] = [
  // AWS - S3 Standard
  {
    providerId: 'aws',
    type: 'object',
    tierName: 'S3 Standard',
    perGbMonth: 0.023,
    freeGbMonth: 5, // First 5GB free in free tier
  },

  // GCP - Cloud Storage Standard
  {
    providerId: 'gcp',
    type: 'object',
    tierName: 'Cloud Storage Standard',
    perGbMonth: 0.020,
    freeGbMonth: 5,
  },

  // Azure - Blob Storage Hot
  {
    providerId: 'azure',
    type: 'object',
    tierName: 'Blob Storage Hot',
    perGbMonth: 0.0184,
    freeGbMonth: 5,
  },

  // Lambda Labs - Persistent Storage
  {
    providerId: 'lambda-labs',
    type: 'object',
    tierName: 'Persistent Storage',
    perGbMonth: 0.20, // Higher than hyperscalers
    freeGbMonth: 0,
  },

  // RunPod - Network Volume
  {
    providerId: 'runpod',
    type: 'object',
    tierName: 'Network Volume',
    perGbMonth: 0.10,
    freeGbMonth: 0,
  },

  // Vast.ai - Storage (variable)
  {
    providerId: 'vast-ai',
    type: 'object',
    tierName: 'Host Storage',
    perGbMonth: 0.15,
    freeGbMonth: 0,
  },

  // CoreWeave - Object Storage
  {
    providerId: 'coreweave',
    type: 'object',
    tierName: 'Object Storage',
    perGbMonth: 0.03,
    freeGbMonth: 0,
  },
];
