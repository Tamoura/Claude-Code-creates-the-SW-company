/**
 * Supported blockchain networks
 */
export type Network = 'polygon' | 'ethereum';

/**
 * Supported stablecoin tokens
 */
export type Token = 'USDC' | 'USDT';

/**
 * Supported fiat currencies
 */
export type Currency = 'USD' | 'EUR' | 'GBP';

/**
 * Payment session status
 */
export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

/**
 * Refund status
 */
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * SDK configuration options
 */
export interface SDKOptions {
  /**
   * Base URL for the Stablecoin Gateway API
   * @default 'https://api.stablecoin-gateway.com'
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed requests
   * @default 3
   */
  retries?: number;
}

/**
 * Parameters for creating a payment session
 */
export interface CreatePaymentSessionParams {
  /**
   * Payment amount in the specified currency
   */
  amount: number;

  /**
   * Currency for the payment (will be converted to USD for stablecoin)
   * @default 'USD'
   */
  currency?: Currency;

  /**
   * Payment description (visible to customer)
   */
  description?: string;

  /**
   * Blockchain network for the payment
   * @default 'polygon'
   */
  network?: Network;

  /**
   * Stablecoin token for the payment
   * @default 'USDC'
   */
  token?: Token;

  /**
   * Merchant's wallet address to receive payment
   */
  merchant_address: string;

  /**
   * URL to redirect customer after successful payment
   */
  success_url?: string;

  /**
   * URL to redirect customer if payment is cancelled
   */
  cancel_url?: string;

  /**
   * URL to receive webhook notifications
   */
  webhook_url?: string;

  /**
   * Custom metadata to attach to the payment
   */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Payment session response from the API
 */
export interface PaymentSession {
  /**
   * Unique payment session ID (prefixed with 'ps_')
   */
  id: string;

  /**
   * Payment amount in USD
   */
  amount: number;

  /**
   * Currency code (always 'USD' after conversion)
   */
  currency: string;

  /**
   * Original amount before currency conversion (if applicable)
   */
  original_amount?: number;

  /**
   * Original currency before conversion (if applicable)
   */
  original_currency?: string;

  /**
   * Exchange rate used for conversion (if applicable)
   */
  exchange_rate?: number;

  /**
   * Payment description
   */
  description?: string;

  /**
   * Current payment status
   */
  status: PaymentStatus;

  /**
   * Blockchain network
   */
  network: Network;

  /**
   * Stablecoin token
   */
  token: Token;

  /**
   * Merchant's wallet address
   */
  merchant_address: string;

  /**
   * Generated deposit address for customer payment
   */
  deposit_address?: string;

  /**
   * URL for customer checkout page
   */
  checkout_url: string;

  /**
   * Success redirect URL
   */
  success_url?: string;

  /**
   * Cancel redirect URL
   */
  cancel_url?: string;

  /**
   * Blockchain transaction hash (when payment is confirmed)
   */
  tx_hash?: string;

  /**
   * Amount refunded (if any)
   */
  refunded_amount?: number;

  /**
   * Custom metadata
   */
  metadata?: Record<string, string | number | boolean>;

  /**
   * Creation timestamp (ISO 8601)
   */
  created_at: string;

  /**
   * Expiration timestamp (ISO 8601)
   */
  expires_at: string;

  /**
   * Last update timestamp (ISO 8601)
   */
  updated_at: string;
}

/**
 * Parameters for listing payment sessions
 */
export interface ListPaymentSessionsParams {
  /**
   * Filter by status
   */
  status?: PaymentStatus;

  /**
   * Maximum number of results to return
   * @default 50
   */
  limit?: number;

  /**
   * Number of results to skip
   * @default 0
   */
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Total number of items
     */
    total: number;

    /**
     * Number of items returned
     */
    limit: number;

    /**
     * Number of items skipped
     */
    offset: number;

    /**
     * Whether there are more items
     */
    has_more: boolean;
  };
}

/**
 * Parameters for creating a refund
 */
export interface CreateRefundParams {
  /**
   * Amount to refund (defaults to full payment amount)
   */
  amount?: number;

  /**
   * Reason for the refund
   */
  reason?: string;
}

/**
 * Refund response from the API
 */
export interface Refund {
  /**
   * Unique refund ID (prefixed with 'ref_')
   */
  id: string;

  /**
   * Associated payment session ID
   */
  payment_id: string;

  /**
   * Refund amount
   */
  amount: number;

  /**
   * Currency (always 'USD')
   */
  currency: string;

  /**
   * Refund status
   */
  status: RefundStatus;

  /**
   * Refund reason
   */
  reason?: string;

  /**
   * Blockchain transaction hash (when refund is completed)
   */
  tx_hash?: string;

  /**
   * Creation timestamp (ISO 8601)
   */
  created_at: string;

  /**
   * Last update timestamp (ISO 8601)
   */
  updated_at: string;
}

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'payment.created'
  | 'payment.pending'
  | 'payment.confirming'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.expired'
  | 'refund.created'
  | 'refund.completed'
  | 'refund.failed';

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  /**
   * Unique event ID
   */
  id: string;

  /**
   * Event type
   */
  type: WebhookEventType;

  /**
   * Event data (payment or refund object)
   */
  data: PaymentSession | Refund;

  /**
   * Event creation timestamp (ISO 8601)
   */
  created_at: string;
}
