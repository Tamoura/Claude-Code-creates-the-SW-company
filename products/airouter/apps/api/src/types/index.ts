import { User, ApiKey } from '@prisma/client';

// ==================== Error Types ====================

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  request_id?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON(): ErrorResponse {
    return {
      type: `https://airouter.dev/errors/${this.code}`,
      title: this.code.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      status: this.statusCode,
      detail: this.message,
    };
  }
}

// ==================== Provider Types ====================

export interface ProviderFreeTier {
  requestsPerDay?: number;
  requestsPerMinute?: number;
  requestsPerSecond?: number;
  requestsPerMonth?: number;
  tokensPerDay?: number;
  tokensPerMonth?: number;
  neuronsPerDay?: number;
  unlimited?: boolean;
}

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow?: number;
}

export interface GuideStep {
  step: number;
  instruction: string;
  note?: string;
}

export interface KeyAcquisitionGuide {
  steps: GuideStep[];
  tips: string[];
  gotchas: string[];
  verificationSteps: string[];
}

export interface ProviderDocumentation {
  quickstart: string;
  pricing: string;
  api: string;
}

export type ProviderCategory =
  | 'Multimodal'
  | 'Speed'
  | 'Edge AI'
  | 'Open Source'
  | 'Enterprise'
  | 'Aggregator'
  | 'Reasoning';

export interface Provider {
  slug: string;
  name: string;
  description: string;
  category: ProviderCategory;
  lastVerified: string;
  prerequisites: string[];
  baseUrl: string;
  apiFormat: 'openai' | 'google' | 'cohere' | 'custom';
  freeTier: ProviderFreeTier;
  models: ProviderModel[];
  keyAcquisitionUrl: string;
  keyAcquisitionGuide: KeyAcquisitionGuide;
  documentation: ProviderDocumentation;
  healthStatus: 'up' | 'down' | 'degraded';
  authHeader: string;
  authPrefix: string;
}

// ==================== Fastify Extensions ====================

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
    apiKey?: ApiKey;
    startTime?: number;
  }

  interface FastifyInstance {
    prisma: import('@prisma/client').PrismaClient;
    redis: import('ioredis').Redis | null;
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
  }
}
