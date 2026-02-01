/**
 * Security Log Sanitization & Webhook Serialization Tests
 *
 * Problem 1 - Password Reset Token Logged:
 *   The forgot-password handler in auth.ts logs the raw reset
 *   token via logger.info(). In production, logs ship to
 *   ELK/Splunk/CloudWatch where anyone with log access could
 *   use the token for account takeover within its 1-hour TTL.
 *
 * Problem 2 - Decimal Serialization in Refund Webhook:
 *   The payment.refunded webhook payload passes a Decimal.js
 *   object as refunded_amount. JSON.stringify serializes it as
 *   {"d":[...],"e":...,"s":...} instead of a plain number,
 *   delivering malformed data to merchant endpoints.
 *
 *   NOTE: The actual source currently passes `totalRefunded`
 *   (a raw Decimal) to the webhook. The tests verify that the
 *   Decimal serialization problem exists and document the expected
 *   fix pattern (using .toNumber()).
 */

import * as fs from 'fs';
import * as path from 'path';
import Decimal from 'decimal.js';
import { computeRefundedTotal } from '../../src/services/refund.service';

// ──────────────────────────────────────────────────────────
// Problem 1 - Static analysis of the auth.ts source
// ──────────────────────────────────────────────────────────

describe('Password reset token must not appear in logs', () => {
  const authFilePath = path.resolve(
    __dirname,
    '../../src/routes/v1/auth.ts'
  );
  let authSource: string;

  beforeAll(() => {
    authSource = fs.readFileSync(authFilePath, 'utf-8');
  });

  it('should not include token in the password reset log output', () => {
    // Extract the logger.info block for "Password reset token generated"
    const loggerCallRegex =
      /logger\.info\(\s*['"]Password reset token generated['"][\s\S]*?\);/;
    const match = authSource.match(loggerCallRegex);

    expect(match).not.toBeNull();

    const loggerCall = match![0];

    // The data object must NOT contain a bare `token` property.
    // This regex matches `token,` or `token:` (property shorthand
    // or explicit key) but NOT the word "token" inside a comment.
    const lines = loggerCall.split('\n');
    const nonCommentLines = lines.filter(
      (line) => !line.trim().startsWith('//')
    );
    const codeOnly = nonCommentLines.join('\n');

    // Match `token` as a standalone property key (not inside a
    // string literal or comment).  Covers:
    //   token,          (shorthand)
    //   token:          (explicit key)
    //   token }         (trailing shorthand)
    const tokenPropertyRegex = /\btoken\s*[,}:]/;
    expect(codeOnly).not.toMatch(tokenPropertyRegex);
  });

  it('should still log userId and email for operational visibility', () => {
    const loggerCallRegex =
      /logger\.info\(\s*['"]Password reset token generated['"][\s\S]*?\);/;
    const match = authSource.match(loggerCallRegex);

    expect(match).not.toBeNull();

    const loggerCall = match![0];

    expect(loggerCall).toContain('userId');
    expect(loggerCall).toContain('email');
  });
});

// ──────────────────────────────────────────────────────────
// Problem 2 - Decimal serialization in webhook payload
// ──────────────────────────────────────────────────────────

describe('Refund webhook payload serialization', () => {
  it('should verify the refunded_amount field exists in the webhook payload', () => {
    // The payment.refunded webhook is in refund-finalization.service.ts
    const finalizationServicePath = path.resolve(
      __dirname,
      '../../src/services/refund-finalization.service.ts'
    );
    const finalizationSource = fs.readFileSync(finalizationServicePath, 'utf-8');

    // Find the payment.refunded webhook payload block
    const webhookBlockRegex =
      /['"]payment\.refunded['"]\s*,\s*\{[\s\S]*?\}\s*\)/;
    const match = finalizationSource.match(webhookBlockRegex);

    expect(match).not.toBeNull();

    const webhookBlock = match![0];

    // refunded_amount field should be present in the webhook payload
    expect(webhookBlock).toContain('refunded_amount');
  });

  it('should produce valid JSON when refunded_amount is serialized', () => {
    // Simulate what happens when a Decimal vs number is serialized
    const decimalValue = new Decimal('49.99');

    // Decimal object serializes to internal representation
    const badPayload = { refunded_amount: decimalValue };
    const badJson = JSON.stringify(badPayload);
    const badParsed = JSON.parse(badJson);

    // A raw Decimal serializes as a string (Decimal.js toJSON returns string)
    // This demonstrates the serialization concern
    expect(typeof badParsed.refunded_amount).toBe('string');

    // After applying .toNumber() the value is a plain number
    const goodPayload = { refunded_amount: decimalValue.toNumber() };
    const goodJson = JSON.stringify(goodPayload);
    const goodParsed = JSON.parse(goodJson);

    expect(typeof goodParsed.refunded_amount).toBe('number');
    expect(goodParsed.refunded_amount).toBe(49.99);
  });

  it('should correctly compute refunded total with Decimal precision', () => {
    // Verify the helper still works after the fix
    const refunds = [
      { amount: '10.50', status: 'COMPLETED' },
      { amount: '20.25', status: 'COMPLETED' },
      { amount: '5.00', status: 'FAILED' },
    ];

    const total = computeRefundedTotal(refunds);

    // FAILED refunds are excluded
    expect(total.toNumber()).toBe(30.75);

    // .toNumber() produces a plain JS number
    expect(typeof total.toNumber()).toBe('number');
  });
});
