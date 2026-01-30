/**
 * Financial Precision Tests
 *
 * Verifies that all financial calculations use Decimal.js instead of
 * JavaScript Number (IEEE 754 floating-point) to prevent rounding errors
 * in payment amounts, refund totals, and blockchain unit conversions.
 *
 * Tests:
 * 1. Basic Decimal arithmetic avoids floating-point error
 * 2. Refund total of three $33.33 on $99.99 leaves $0.00
 * 3. Large amounts (>$1M) maintain precision
 * 4. Wei-to-USD conversion maintains 6-decimal precision (USDC)
 * 5. Refund remaining calculation is precise
 */

import Decimal from 'decimal.js';
import {
  computeRefundedTotal,
  computeRemainingAmount,
} from '../../src/services/refund.service';
import { weiToUsd } from '../../src/services/blockchain-monitor.service';

describe('Financial Precision (Decimal.js)', () => {
  describe('Basic Decimal arithmetic', () => {
    it('should compute 0.1 + 0.2 as exactly 0.3', () => {
      const result = new Decimal('0.1').plus('0.2');
      expect(result.equals(new Decimal('0.3'))).toBe(true);

      // Contrast with native Number which fails this:
      expect(0.1 + 0.2).not.toBe(0.3);
    });
  });

  describe('Refund total accumulation', () => {
    it('should compute three $33.33 refunds on $99.99 leaving $0.00', () => {
      const refunds = [
        { amount: '33.33', status: 'COMPLETED' },
        { amount: '33.33', status: 'COMPLETED' },
        { amount: '33.33', status: 'COMPLETED' },
      ];
      const paymentAmount = '99.99';

      const totalRefunded = computeRefundedTotal(refunds);
      const remaining = computeRemainingAmount(paymentAmount, totalRefunded);

      expect(totalRefunded.toString()).toBe('99.99');
      expect(remaining.toString()).toBe('0');
    });

    it('should exclude FAILED refunds from the total', () => {
      const refunds = [
        { amount: '33.33', status: 'COMPLETED' },
        { amount: '33.33', status: 'FAILED' },
        { amount: '33.33', status: 'PENDING' },
      ];

      const totalRefunded = computeRefundedTotal(refunds);
      // FAILED excluded, COMPLETED + PENDING included
      expect(totalRefunded.toString()).toBe('66.66');
    });
  });

  describe('Large amounts (>$1M)', () => {
    it('should maintain precision for $1,234,567.89', () => {
      const paymentAmount = '1234567.89';
      const refunds = [
        { amount: '1000000.00', status: 'COMPLETED' },
        { amount: '234567.89', status: 'COMPLETED' },
      ];

      const totalRefunded = computeRefundedTotal(refunds);
      const remaining = computeRemainingAmount(paymentAmount, totalRefunded);

      expect(totalRefunded.toString()).toBe('1234567.89');
      expect(remaining.toString()).toBe('0');
    });

    it('should maintain precision for partial refund on large amount', () => {
      const paymentAmount = '9999999.99';
      const refunds = [
        { amount: '3333333.33', status: 'COMPLETED' },
      ];

      const totalRefunded = computeRefundedTotal(refunds);
      const remaining = computeRemainingAmount(paymentAmount, totalRefunded);

      expect(remaining.toString()).toBe('6666666.66');
    });
  });

  describe('Wei-to-USD conversion (USDC 6 decimals)', () => {
    it('should convert 1000000 wei to exactly 1.000000 USD', () => {
      const result = weiToUsd('1000000', 6);
      expect(result).toBe('1');
    });

    it('should convert 1 wei to 0.000001 USD', () => {
      const result = weiToUsd('1', 6);
      expect(result).toBe('0.000001');
    });

    it('should convert large wei value precisely', () => {
      // $1,234,567.890123
      const result = weiToUsd('1234567890123', 6);
      expect(result).toBe('1234567.890123');
    });

    it('should handle wei value that causes floating-point error in Number', () => {
      // 0.1 + 0.2 in smallest units: 100000 + 200000 = 300000 => 0.3 USD
      const a = weiToUsd('100000', 6);
      const b = weiToUsd('200000', 6);
      const sum = new Decimal(a).plus(new Decimal(b));
      expect(sum.toString()).toBe('0.3');
    });
  });

  describe('Refund remaining calculation', () => {
    it('should compute remaining precisely after partial refunds', () => {
      const paymentAmount = '100.00';
      const refunds = [
        { amount: '10.01', status: 'COMPLETED' },
        { amount: '20.02', status: 'COMPLETED' },
        { amount: '30.03', status: 'COMPLETED' },
      ];

      const totalRefunded = computeRefundedTotal(refunds);
      const remaining = computeRemainingAmount(paymentAmount, totalRefunded);

      expect(totalRefunded.toString()).toBe('60.06');
      expect(remaining.toString()).toBe('39.94');
    });

    it('should return zero when fully refunded', () => {
      const paymentAmount = '50.00';
      const refunds = [
        { amount: '25.00', status: 'COMPLETED' },
        { amount: '25.00', status: 'PENDING' },
      ];

      const totalRefunded = computeRefundedTotal(refunds);
      const remaining = computeRemainingAmount(paymentAmount, totalRefunded);

      expect(remaining.toString()).toBe('0');
    });

    it('should correctly identify when a refund would exceed remaining', () => {
      const paymentAmount = '99.99';
      const refunds = [
        { amount: '33.33', status: 'COMPLETED' },
        { amount: '33.33', status: 'COMPLETED' },
      ];

      const totalRefunded = computeRefundedTotal(refunds);
      const remaining = computeRemainingAmount(paymentAmount, totalRefunded);
      const proposedRefund = new Decimal('33.34');

      expect(remaining.toString()).toBe('33.33');
      expect(proposedRefund.greaterThan(remaining)).toBe(true);
    });
  });
});
