/**
 * Payment State Machine
 *
 * Defines and enforces valid payment status transitions to prevent
 * unauthorized or invalid state changes.
 *
 * State Transition Rules:
 * - PENDING → CONFIRMING: Transaction submitted to blockchain
 * - PENDING → FAILED: Payment expired or error occurred
 * - CONFIRMING → COMPLETED: Transaction confirmed with required confirmations
 * - CONFIRMING → FAILED: Transaction verification failed
 * - COMPLETED → REFUNDED: Full refund processed
 * - Any state → Same state: Idempotent updates allowed
 *
 * Terminal States:
 * - COMPLETED: Can only transition to REFUNDED
 * - FAILED: Terminal state (no transitions allowed)
 * - REFUNDED: Terminal state (no transitions allowed)
 *
 * Security:
 * - Prevents skipping confirmation step (PENDING → COMPLETED blocked)
 * - Prevents reversing completed payments
 * - Prevents refunding unpaid payments
 * - Enforces proper payment lifecycle
 */

import { PaymentStatus } from '@prisma/client';
import { AppError } from '../types/index.js';

/**
 * Valid state transitions map
 *
 * Key: current status
 * Value: array of allowed next statuses
 */
const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  // PENDING: Initial state
  // Can move to CONFIRMING (tx submitted) or FAILED (expired/error)
  [PaymentStatus.PENDING]: [
    PaymentStatus.PENDING, // Idempotent update
    PaymentStatus.CONFIRMING,
    PaymentStatus.FAILED,
  ],

  // CONFIRMING: Transaction submitted, waiting for confirmations
  // Can move to COMPLETED (confirmed) or FAILED (verification failed)
  [PaymentStatus.CONFIRMING]: [
    PaymentStatus.CONFIRMING, // Idempotent update
    PaymentStatus.COMPLETED,
    PaymentStatus.FAILED,
  ],

  // COMPLETED: Payment successfully confirmed
  // Can only move to REFUNDED (full refund)
  [PaymentStatus.COMPLETED]: [
    PaymentStatus.COMPLETED, // Idempotent update
    PaymentStatus.REFUNDED,
  ],

  // FAILED: Terminal state
  // No transitions allowed (can only stay FAILED)
  [PaymentStatus.FAILED]: [
    PaymentStatus.FAILED, // Idempotent update only
  ],

  // REFUNDED: Terminal state
  // No transitions allowed (can only stay REFUNDED)
  [PaymentStatus.REFUNDED]: [
    PaymentStatus.REFUNDED, // Idempotent update only
  ],
};

/**
 * Validate a payment status transition
 *
 * @param currentStatus - Current payment status
 * @param newStatus - Desired new status
 * @throws {AppError} If transition is not allowed
 */
export function validatePaymentStatusTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): void {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError(
      400,
      'invalid-status-transition',
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      `Valid transitions from ${currentStatus}: ${allowedTransitions.join(', ')}`
    );
  }
}

/**
 * Get all valid next statuses for a given current status
 *
 * Useful for API documentation or UI state indicators
 */
export function getValidNextStatuses(currentStatus: PaymentStatus): PaymentStatus[] {
  return VALID_TRANSITIONS[currentStatus].filter((status) => status !== currentStatus);
}

/**
 * Check if a status is terminal (no outgoing transitions except to itself)
 */
export function isTerminalStatus(status: PaymentStatus): boolean {
  return status === PaymentStatus.FAILED || status === PaymentStatus.REFUNDED;
}

/**
 * Get a human-readable description of the payment lifecycle
 */
export function getPaymentLifecycleDescription(): string {
  return `
Payment Lifecycle:

1. PENDING
   └─> Transaction created, awaiting customer payment
   └─> Can transition to: CONFIRMING, FAILED

2. CONFIRMING
   └─> Transaction submitted to blockchain
   └─> Waiting for confirmations
   └─> Can transition to: COMPLETED, FAILED

3. COMPLETED
   └─> Payment successfully confirmed
   └─> Can transition to: REFUNDED

4. FAILED (Terminal)
   └─> Payment failed or expired
   └─> No further transitions allowed

5. REFUNDED (Terminal)
   └─> Payment was fully refunded
   └─> No further transitions allowed
  `.trim();
}
