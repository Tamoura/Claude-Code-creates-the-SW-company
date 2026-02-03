/**
 * Structured Error Catalog
 *
 * Centralizes all application error definitions. Each error has a unique
 * code, HTTP status, and default message. Consumers use `createError()`
 * to instantiate an `AppError` from a catalog entry, optionally
 * overriding the message or attaching additional details.
 *
 * ADR: Scattered `new AppError(...)` calls across 15+ files make it
 * difficult for AI agents and new developers to discover what errors
 * exist, which HTTP codes map to which scenarios, and whether codes
 * are reused consistently. This catalog provides a single source of
 * truth for error metadata while remaining backward-compatible with
 * the existing `AppError` class.
 */

import { AppError } from '../types/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorDefinition {
  /** HTTP status code (e.g. 400, 401, 404) */
  status: number;
  /** Machine-readable error code (e.g. 'not-found') */
  code: string;
  /** Default human-readable message */
  message: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an `AppError` from a catalog entry.
 *
 * @param def     - The catalog entry (e.g. `ERRORS.PAYMENT_NOT_FOUND`)
 * @param message - Optional override message (defaults to `def.message`)
 * @param details - Optional structured details attached to the error
 */
export function createError(
  def: ErrorDefinition,
  message?: string,
  details?: unknown,
): AppError {
  return new AppError(def.status, def.code, message ?? def.message, details);
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const ERRORS = {
  // ── Authentication (401) ──────────────────────────────────────────────
  MISSING_AUTH_HEADER: {
    status: 401,
    code: 'unauthorized',
    message: 'Missing authorization header',
  },
  INVALID_AUTH_FORMAT: {
    status: 401,
    code: 'unauthorized',
    message: 'Invalid authorization format',
  },
  TOKEN_REVOKED: {
    status: 401,
    code: 'token-revoked',
    message: 'Token has been revoked',
  },
  USER_NOT_FOUND_AUTH: {
    status: 401,
    code: 'unauthorized',
    message: 'User not found',
  },
  INVALID_API_KEY: {
    status: 401,
    code: 'unauthorized',
    message: 'Invalid API key',
  },
  AUTH_FAILED: {
    status: 401,
    code: 'unauthorized',
    message: 'Authentication failed',
  },
  INVALID_CREDENTIALS: {
    status: 401,
    code: 'invalid-credentials',
    message: 'Invalid email or password',
  },
  INVALID_REFRESH_TOKEN: {
    status: 401,
    code: 'invalid-token',
    message: 'Invalid refresh token',
  },
  REFRESH_TOKEN_NOT_FOUND: {
    status: 401,
    code: 'invalid-token',
    message: 'Refresh token not found',
  },
  REFRESH_TOKEN_REVOKED: {
    status: 401,
    code: 'invalid-token',
    message: 'Refresh token has been revoked',
  },
  REFRESH_TOKEN_EXPIRED: {
    status: 401,
    code: 'invalid-token',
    message: 'Refresh token has expired',
  },

  // ── Authorization (403) ───────────────────────────────────────────────
  INSUFFICIENT_PERMISSIONS: {
    status: 403,
    code: 'insufficient-permissions',
    message: 'Insufficient permissions',
  },
  ACCESS_DENIED: {
    status: 403,
    code: 'access-denied',
    message: 'You do not have access to this payment session',
  },

  // ── Not Found (404) ──────────────────────────────────────────────────
  PAYMENT_NOT_FOUND: {
    status: 404,
    code: 'not-found',
    message: 'Payment session not found',
  },
  REFUND_NOT_FOUND: {
    status: 404,
    code: 'refund-not-found',
    message: 'Refund not found',
  },
  WEBHOOK_NOT_FOUND: {
    status: 404,
    code: 'webhook-not-found',
    message: 'Webhook not found',
  },
  API_KEY_NOT_FOUND: {
    status: 404,
    code: 'api-key-not-found',
    message: 'API key not found',
  },
  TOKEN_NOT_FOUND: {
    status: 404,
    code: 'token-not-found',
    message: 'Refresh token not found or already revoked',
  },

  // ── Validation / Bad Request (400) ────────────────────────────────────
  MISSING_TX_HASH: {
    status: 400,
    code: 'missing-tx-hash',
    message: 'Transaction hash required when changing status to CONFIRMING or COMPLETED',
  },
  INVALID_TRANSACTION: {
    status: 400,
    code: 'invalid-transaction',
    message: 'Transaction verification failed',
  },
  BLOCKCHAIN_FIELDS_WITHOUT_TRANSITION: {
    status: 400,
    code: 'blockchain-fields-require-status-transition',
    message: 'Cannot update blockchain fields without a status transition to CONFIRMING or COMPLETED',
  },
  SESSION_EXPIRED: {
    status: 400,
    code: 'session-expired',
    message: 'Payment session has expired',
  },
  MISSING_TOKEN: {
    status: 400,
    code: 'missing-token',
    message: 'Refresh token is required',
  },
  INVALID_RESET_TOKEN: {
    status: 400,
    code: 'invalid-token',
    message: 'Invalid or expired reset token',
  },
  INVALID_WEBHOOK_URL: {
    status: 400,
    code: 'invalid-webhook-url',
    message: 'Invalid webhook URL format',
  },
  INVALID_ENCRYPTED_DATA: {
    status: 400,
    code: 'invalid-encrypted-data',
    message: 'Invalid encrypted data format',
  },
  INVALID_REFUND_AMOUNT: {
    status: 400,
    code: 'invalid-refund-amount',
    message: 'Refund amount must be greater than 0',
  },
  PAYMENT_NOT_REFUNDABLE: {
    status: 400,
    code: 'payment-not-refundable',
    message: 'Payment must be in a refundable state (COMPLETED or REFUNDED)',
  },
  REFUND_EXCEEDS_PAYMENT: {
    status: 400,
    code: 'refund-exceeds-payment',
    message: 'Refund amount exceeds remaining refundable amount',
  },
  INVALID_REFUND_STATUS: {
    status: 400,
    code: 'invalid-refund-status',
    message: 'Refund must be in PROCESSING status to confirm finality',
  },
  CUSTOMER_ADDRESS_MISSING: {
    status: 400,
    code: 'customer-address-missing',
    message: 'Cannot process refund - customer address not available',
  },
  INVALID_STATUS_TRANSITION: {
    status: 400,
    code: 'invalid-status-transition',
    message: 'Invalid status transition',
  },

  // ── Conflict (409) ───────────────────────────────────────────────────
  USER_EXISTS: {
    status: 409,
    code: 'user-exists',
    message: 'User with this email already exists',
  },
  IDEMPOTENCY_MISMATCH: {
    status: 409,
    code: 'idempotency-mismatch',
    message: 'A request with this idempotency key already exists with different parameters',
  },

  // ── Rate Limiting (429) ──────────────────────────────────────────────
  ACCOUNT_LOCKED: {
    status: 429,
    code: 'account-locked',
    message: 'Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.',
  },

  // ── Server Errors (500) ──────────────────────────────────────────────
  KMS_CONFIG_ERROR: {
    status: 500,
    code: 'kms-config-error',
    message: 'KMS Key ID is required',
  },
  KMS_NOT_CONFIGURED: {
    status: 500,
    code: 'kms-not-configured',
    message: 'KMS_KEY_ID environment variable is required',
  },
  ENCRYPTION_NOT_INITIALIZED: {
    status: 500,
    code: 'encryption-not-initialized',
    message: 'Encryption system not initialized',
  },
  ENCRYPTION_FAILED: {
    status: 500,
    code: 'encryption-failed',
    message: 'Failed to encrypt secret',
  },
  DECRYPTION_FAILED: {
    status: 500,
    code: 'decryption-failed',
    message: 'Failed to decrypt secret - data may have been tampered with',
  },
  ENCRYPTION_REQUIRED: {
    status: 500,
    code: 'encryption-required',
    message: 'Webhook encryption key is required in production',
  },
  BLOCKCHAIN_SERVICE_UNAVAILABLE: {
    status: 500,
    code: 'blockchain-service-unavailable',
    message: 'Cannot process refund: blockchain service unavailable',
  },
  BLOCKCHAIN_TRANSACTION_FAILED: {
    status: 500,
    code: 'blockchain-transaction-failed',
    message: 'Refund transaction failed',
  },
  REFUND_PROCESSING_FAILED: {
    status: 500,
    code: 'refund-processing-failed',
    message: 'Failed to process refund',
  },
  BLOCKCHAIN_VERIFY_ERROR: {
    status: 500,
    code: 'blockchain-error',
    message: 'Failed to verify transaction',
  },
  INVALID_NETWORK: {
    status: 500,
    code: 'invalid-network',
    message: 'Invalid blockchain network',
  },

  // ── Service Unavailable (503) ────────────────────────────────────────
  PASSWORD_RESET_UNAVAILABLE: {
    status: 503,
    code: 'service-unavailable',
    message: 'Password reset is temporarily unavailable',
  },
} as const satisfies Record<string, ErrorDefinition>;

// Type-safe error key union
export type ErrorKey = keyof typeof ERRORS;
