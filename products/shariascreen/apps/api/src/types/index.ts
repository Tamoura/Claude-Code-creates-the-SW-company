import { User, ApiKey } from '@prisma/client';

// ==================== Screening Types ====================

export type ComplianceStatusType =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'DOUBTFUL';

export interface FinancialRatios {
  debtRatio: number;
  interestIncomeRatio: number;
  cashRatio: number;
  receivablesRatio: number;
}

export interface BusinessActivityResult {
  pass: boolean;
  details: string;
  nonPermissibleRevenuePercent: number;
}

export interface PurificationResult {
  required: boolean;
  amountPerShare: number;
}

export interface ScreeningInput {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  totalDebt: number;
  totalRevenue: number;
  interestIncome: number;
  cashAndEquivalents: number;
  accountsReceivable: number;
  nonPermissibleRevenue: number;
  dividendPerShare: number;
  totalAssets: number;
}

export interface ScreeningOutput {
  ticker: string;
  name: string;
  status: ComplianceStatusType;
  standard: string;
  ratios: FinancialRatios;
  businessActivity: BusinessActivityResult;
  purification: PurificationResult;
  screenedAt: string;
}

export interface DetailedReport extends ScreeningOutput {
  explanation: string;
}

export interface BatchScreeningResponse {
  results: ScreeningOutput[];
  meta: {
    total: number;
    compliant: number;
    nonCompliant: number;
    doubtful: number;
  };
}

// ==================== Auth Types ====================

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  access_token: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: {
    read?: boolean;
    write?: boolean;
  };
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string;
  key_prefix: string;
  permissions: Record<string, boolean>;
  last_used_at: string | null;
  created_at: string;
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
    authenticate: (
      request: FastifyRequest
    ) => Promise<void>;
    optionalAuth: (
      request: FastifyRequest
    ) => Promise<void>;
    requirePermission: (
      permission: 'read' | 'write'
    ) => (request: FastifyRequest) => Promise<void>;
  }
}
