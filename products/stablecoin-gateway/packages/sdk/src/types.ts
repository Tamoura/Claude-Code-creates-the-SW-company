export type PaymentSessionStatus =
  | 'PENDING'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type Network = 'polygon' | 'ethereum';
export type Token = 'USDC' | 'USDT';
export type Currency = 'USD';

export interface PaymentSession {
  id: string;
  amount: number;
  currency: Currency;
  description: string | null;
  status: PaymentSessionStatus;
  network: Network;
  token: Token;
  merchant_address: string;
  customer_address: string | null;
  tx_hash: string | null;
  block_number: number | null;
  confirmations: number;
  checkout_url: string;
  metadata: Record<string, unknown> | null;
  success_url: string | null;
  cancel_url: string | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}

export interface CreatePaymentSessionParams {
  amount: number;
  currency?: Currency;
  description?: string;
  network?: Network;
  token?: Token;
  merchant_address: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface ListPaymentSessionsParams {
  limit?: number;
  offset?: number;
  status?: PaymentSessionStatus;
  network?: Network;
  created_after?: string;
  created_before?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    has_more: boolean;
    limit: number;
    offset: number;
  };
}

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Refund {
  id: string;
  payment_session_id: string;
  amount: number;
  status: RefundStatus;
  reason: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateRefundParams {
  payment_session_id: string;
  amount: number;
  reason?: string;
  idempotency_key?: string;
}

export interface ListRefundsParams {
  payment_session_id?: string;
  status?: RefundStatus;
  limit?: number;
  offset?: number;
}

export interface StablecoinGatewayOptions {
  baseUrl?: string;
}
