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
 * ADR: Payment State Machine Design
 *
 * Terminal states (COMPLETED, FAILED, REFUNDED) include self-
 * transitions (e.g. COMPLETED -> COMPLETED) to support idempotent
 * event processing. In distributed systems, blockchain indexers,
 * webhook retries, and queue consumers may deliver the same state
 * change event multiple times. Without self-transitions, a duplicate
 * "payment completed" event would throw an invalid-transition error,
 * forcing every caller to wrap status updates in try/catch or pre-
 * check logic. Allowing self-transitions lets the system absorb
 * duplicates silently, following the principle that idempotent
 * operations should be safe to retry.
 *
 * The state machine is a separate module rather than being embedded
 * in PaymentService. This follows single responsibility: the service
 * handles persistence, webhooks, and business orchestration, while
 * the state machine encodes only the transition rules. Separation
 * makes the transition rules independently testable (unit tests
 * validate every allowed and rejected transition without a database)
 * and reusable if other services need to validate transitions (e.g.
 * the refund service checks payment status before allowing refunds).
 *
 * Transitions are validated against explicit allow-lists rather than
 * deny-lists (i.e. "these transitions ARE allowed" vs "these ARE
 * NOT"). A deny-list approach would silently permit any new status
 * added in the future unless explicitly blocked. The allow-list
 * ensures that adding a new PaymentStatus enum value requires a
 * conscious decision about which transitions to permit, preventing
 * accidental paths like PENDING -> REFUNDED (refunding before
 * payment) that could cause financial loss.
 *
 * Alternatives considered:
 * - Deny-list (block specific transitions): Rejected because it
 *   defaults to open, which is unsafe for a financial state machine.
 * - Embedded in PaymentService: Rejected because it couples
 *   transition validation to database/webhook logic, making unit
 *   tests require a full service setup.
 * - State machine library (xstate): Rejected as over-engineered
 *   for a linear 5-state lifecycle; a simple map is more readable
 *   and has zero dependencies.
 *
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
