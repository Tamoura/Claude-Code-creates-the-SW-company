/**
 * Payment State Machine Tests
 *
 * Tests state transition validation for payment sessions:
 * - Valid transitions
 * - Invalid transitions
 * - State machine rules enforcement
 */

import { validatePaymentStatusTransition } from '../../src/utils/payment-state-machine';
import { PaymentStatus } from '@prisma/client';

describe('Payment State Machine', () => {
  describe('Valid Transitions', () => {
    it('should allow PENDING → CONFIRMING (transaction submitted)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.CONFIRMING)
      ).not.toThrow();
    });

    it('should allow PENDING → FAILED (payment expired or error)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.FAILED)
      ).not.toThrow();
    });

    it('should allow CONFIRMING → COMPLETED (confirmations reached)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.CONFIRMING, PaymentStatus.COMPLETED)
      ).not.toThrow();
    });

    it('should allow CONFIRMING → FAILED (verification failed)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.CONFIRMING, PaymentStatus.FAILED)
      ).not.toThrow();
    });

    it('should allow COMPLETED → REFUNDED (full refund processed)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.COMPLETED, PaymentStatus.REFUNDED)
      ).not.toThrow();
    });

    it('should allow same-state transitions (idempotent updates)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.PENDING)
      ).not.toThrow();

      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.CONFIRMING, PaymentStatus.CONFIRMING)
      ).not.toThrow();

      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.COMPLETED, PaymentStatus.COMPLETED)
      ).not.toThrow();
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject PENDING → COMPLETED (must go through CONFIRMING)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.COMPLETED)
      ).toThrow('Invalid status transition');
    });

    it('should reject PENDING → REFUNDED (cannot refund unpaid payment)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.REFUNDED)
      ).toThrow('Invalid status transition');
    });

    it('should reject CONFIRMING → PENDING (cannot go backwards)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.CONFIRMING, PaymentStatus.PENDING)
      ).toThrow('Invalid status transition');
    });

    it('should reject CONFIRMING → REFUNDED (must be completed first)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.CONFIRMING, PaymentStatus.REFUNDED)
      ).toThrow('Invalid status transition');
    });

    it('should reject COMPLETED → PENDING (cannot reverse completion)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.COMPLETED, PaymentStatus.PENDING)
      ).toThrow('Invalid status transition');
    });

    it('should reject COMPLETED → CONFIRMING (cannot go backwards)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.COMPLETED, PaymentStatus.CONFIRMING)
      ).toThrow('Invalid status transition');
    });

    it('should reject COMPLETED → FAILED (completed payments cannot fail)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.COMPLETED, PaymentStatus.FAILED)
      ).toThrow('Invalid status transition');
    });

    it('should reject FAILED → PENDING (failed payments cannot be retried)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.FAILED, PaymentStatus.PENDING)
      ).toThrow('Invalid status transition');
    });

    it('should reject FAILED → CONFIRMING (failed payments cannot be confirmed)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.FAILED, PaymentStatus.CONFIRMING)
      ).toThrow('Invalid status transition');
    });

    it('should reject FAILED → COMPLETED (failed payments cannot be completed)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.FAILED, PaymentStatus.COMPLETED)
      ).toThrow('Invalid status transition');
    });

    it('should reject FAILED → REFUNDED (cannot refund failed payment)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.FAILED, PaymentStatus.REFUNDED)
      ).toThrow('Invalid status transition');
    });

    it('should reject REFUNDED → PENDING (refunded payments are final)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.REFUNDED, PaymentStatus.PENDING)
      ).toThrow('Invalid status transition');
    });

    it('should reject REFUNDED → CONFIRMING (refunded payments are final)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.REFUNDED, PaymentStatus.CONFIRMING)
      ).toThrow('Invalid status transition');
    });

    it('should reject REFUNDED → COMPLETED (refunded payments are final)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.REFUNDED, PaymentStatus.COMPLETED)
      ).toThrow('Invalid status transition');
    });

    it('should reject REFUNDED → FAILED (refunded payments are final)', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.REFUNDED, PaymentStatus.FAILED)
      ).toThrow('Invalid status transition');
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message for invalid transition', () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.COMPLETED)
      ).toThrow('Invalid status transition from PENDING to COMPLETED');
    });

    it('should include valid transitions in error hint', () => {
      try {
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.REFUNDED);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        // AppError has a hint property with valid transitions
        if (error.hint) {
          expect(error.hint).toContain('Valid transitions from PENDING');
          expect(error.hint).toContain('CONFIRMING');
          expect(error.hint).toContain('FAILED');
        }
        // The main message should describe the invalid transition
        expect(error.message).toContain('Invalid status transition from PENDING to REFUNDED');
      }
    });
  });

  describe('State Machine Documentation', () => {
    it('should document all valid transitions', () => {
      // This test ensures the state machine is well-documented
      const expectedTransitions = {
        PENDING: ['PENDING', 'CONFIRMING', 'FAILED'],
        CONFIRMING: ['CONFIRMING', 'COMPLETED', 'FAILED'],
        COMPLETED: ['COMPLETED', 'REFUNDED'],
        FAILED: ['FAILED'],
        REFUNDED: ['REFUNDED'],
      };

      // Verify documentation matches implementation
      Object.entries(expectedTransitions).forEach(([from, toStates]) => {
        toStates.forEach((to) => {
          expect(() =>
            validatePaymentStatusTransition(from as PaymentStatus, to as PaymentStatus)
          ).not.toThrow();
        });
      });
    });
  });
});
