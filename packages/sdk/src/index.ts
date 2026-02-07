/**
 * @stablecoin-gateway/sdk
 *
 * Official TypeScript/JavaScript SDK for the Stablecoin Gateway API.
 * Accept stablecoin payments (USDC, USDT) on Polygon and Ethereum.
 *
 * @example
 * ```typescript
 * import { StablecoinGateway } from '@stablecoin-gateway/sdk';
 *
 * const gateway = new StablecoinGateway('your-api-key');
 *
 * const session = await gateway.createPaymentSession({
 *   amount: 100,
 *   merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
 * });
 *
 * console.log('Checkout URL:', session.checkout_url);
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { StablecoinGateway } from './client';

// Webhook utilities
export {
  verifyWebhookSignature,
  parseWebhookPayload,
  generateWebhookSignature,
} from './webhooks';

// Error classes
export {
  StablecoinGatewayError,
  ApiError,
  WebhookSignatureError,
  TimeoutError,
  ConfigurationError,
} from './errors';

// Types
export type {
  // SDK options
  SDKOptions,

  // Payment types
  Network,
  Token,
  Currency,
  PaymentStatus,
  CreatePaymentSessionParams,
  PaymentSession,
  ListPaymentSessionsParams,

  // Refund types
  RefundStatus,
  CreateRefundParams,
  Refund,

  // Pagination
  PaginatedResponse,

  // Webhook types
  WebhookEventType,
  WebhookPayload,
} from './types';
