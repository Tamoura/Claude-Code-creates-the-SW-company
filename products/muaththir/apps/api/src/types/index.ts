import { Parent } from '@prisma/client';
import type { EmailService } from '../plugins/email';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    prisma: import('@prisma/client').PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
    email: EmailService;
  }

  interface FastifyRequest {
    startTime?: number;
    currentUser?: Parent;
  }
}

// Dimension constants
export const DIMENSIONS = [
  'academic',
  'social_emotional',
  'behavioural',
  'aspirational',
  'islamic',
  'physical',
] as const;

export type DimensionType = typeof DIMENSIONS[number];

// Sentiment constants
export const SENTIMENTS = [
  'positive',
  'neutral',
  'needs_attention',
] as const;

export type SentimentType = typeof SENTIMENTS[number];

// Age band constants
export const AGE_BANDS = [
  'early_years',
  'primary',
  'upper_primary',
  'secondary',
] as const;

export type AgeBandType = typeof AGE_BANDS[number];
