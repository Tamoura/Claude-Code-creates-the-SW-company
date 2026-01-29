import { User, ApiKey, PaymentStatus, RefundStatus } from '@prisma/client';

// ==================== API Request/Response Types ====================

export interface CreatePaymentSessionRequest {
  amount: number;
  currency?: string;
  description?: string;
  network?: 'polygon' | 'ethereum';
  token?: 'USDC' | 'USDT';
  merchant_address: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  // NOTE: idempotency_key removed - use Idempotency-Key header instead
}

export interface PaymentSessionResponse {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: PaymentStatus;
  network: string;
  token: string;
  merchant_address: string;
  customer_address: string | null;
  tx_hash: string | null;
  block_number: number | null;
  confirmations: number;
  checkout_url: string;
  success_url: string | null;
  cancel_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}

export interface ListPaymentSessionsQuery {
  limit?: number;
  offset?: number;
  status?: PaymentStatus;
  network?: 'polygon' | 'ethereum';
  created_after?: string;
  created_before?: string;
}

export interface PaginationResponse {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

export interface CreateRefundRequest {
  payment_session_id: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  id: string;
  payment_session_id: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  tx_hash: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  description?: string;
}

export interface WebhookEndpointResponse {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  created_at: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: {
    read?: boolean;
    write?: boolean;
    refund?: boolean;
  };
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string; // Only returned on creation
  key_prefix: string;
  permissions: Record<string, boolean>;
  last_used_at: string | null;
  created_at: string;
}

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
  refresh_token: string;
  created_at?: string;
}

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
      type: `https://gateway.io/errors/${this.code}`,
      title: this.code.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      status: this.statusCode,
      detail: this.message,
    };
  }
}

// ==================== Blockchain Types ====================

export interface BlockchainProvider {
  name: 'alchemy' | 'infura' | 'quicknode';
  endpoint: string;
}

export interface TransactionMonitorJob {
  paymentSessionId: string;
  txHash: string;
  network: 'ethereum' | 'polygon';
  customerAddress: string;
  merchantAddress: string;
  expectedAmount: string; // in token wei (6 decimals for USDC/USDT)
  token: 'USDC' | 'USDT';
}

export interface RefundTransactionJob {
  refundId: string;
  paymentSessionId: string;
  toAddress: string;
  amount: string; // in token wei
  network: 'ethereum' | 'polygon';
  token: 'USDC' | 'USDT';
}

export interface WebhookDeliveryJob {
  endpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface EmailJob {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

// ==================== Fastify Extensions ====================

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
    apiKey?: ApiKey;
  }

  interface FastifyInstance {
    prisma: import('@prisma/client').PrismaClient;
    redis: import('ioredis').Redis | null;
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
    requirePermission: (permission: 'read' | 'write' | 'refund') => (request: FastifyRequest) => Promise<void>;
  }
}
