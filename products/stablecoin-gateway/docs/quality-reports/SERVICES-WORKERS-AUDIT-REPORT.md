# Stablecoin Gateway: Services & Workers Deep Audit

**Audit Date**: 2026-02-28
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Scope**: `apps/api/src/services/` (19 files) and `apps/api/src/workers/` (1 file)
**Methodology**: Line-by-line static analysis across 7 dimensions

---

## Executive Summary

**Overall Assessment: Good (7.5/10)**

The services layer demonstrates mature engineering practices: pessimistic row locking for concurrent state transitions, Decimal.js for monetary arithmetic, SSRF-protected webhook delivery, timing-safe signature verification, and KMS-backed key management. The codebase is significantly above average for a payment gateway at this stage.

However, several findings require attention before production hardening:

| Severity | Count | Summary |
|----------|-------|---------|
| Critical | 1 | Audit log `record()` silently drops DB write errors without in-memory fallback guarantee |
| High | 5 | SSRF TOCTOU gap, missing pagination limits on audit queries, untyped `any` in webhook delivery, email service is a no-op in production, refund worker lock release not wrapped in try/catch |
| Medium | 9 | Various type safety gaps, missing input validation on internal callers, race window in secret cache eviction |
| Low | 7 | Minor code quality items, documentation gaps |

**Top 3 Risks**:
1. The email service (`email.service.ts`) is entirely a no-op -- it logs "Email sent" but sends nothing. Any flow depending on email delivery (receipts, merchant notifications) silently fails.
2. The audit log service has a subtle bug where successful DB persistence skips in-memory storage, but failed DB persistence falls back to in-memory -- meaning if Prisma is provided but the DB write promise is not awaited by the caller, the audit entry may be lost entirely.
3. The SSRF protection in `url-validator.ts` has a classic TOCTOU (Time-of-Check-Time-of-Use) gap: DNS is resolved at validation time but the actual `fetch()` in webhook delivery resolves DNS again, potentially to a different (private) IP.

**Recommendation**: Fix Critical and High items before any production deployment. The codebase is well-architected and the fixes are surgical, not structural.

---

## File-by-File Analysis

---

### 1. `analytics.service.ts` (133 lines)

**Purpose**: Read-only analytics aggregation (overview stats, volume over time, payment breakdowns).

#### Security Controls
- **Auth checks**: Relies on `userId` parameter for tenant isolation -- good. All queries filter by `userId`.
- **Input validation**: `period` parameter is typed as union `'day' | 'week' | 'month'` -- TypeScript enforces at compile time. No runtime validation needed if the route validates upstream.
- **Injection prevention**: Uses Prisma's parameterized queries exclusively -- no raw SQL.

#### What's Working Well
- **RISK-053 compliance**: Integer-cent accumulation in `getVolume()` (line 84) avoids floating-point drift during long summation loops. This is excellent financial engineering.
- **Decimal precision**: `Math.round(x * 100) / 100` pattern used consistently for final output values.
- **Efficient queries**: `Promise.all` for parallel aggregation in `getOverview()` (line 29).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| A-01 | **Low** | 71 | `getVolume()` fetches ALL completed payments for the user within the date range into memory, then buckets in JS. For merchants with millions of payments, this causes OOM. Should use a `GROUP BY` query with date truncation at the DB level. | CWE-400 (Uncontrolled Resource Consumption) |
| A-02 | **Low** | 107 | `getPaymentBreakdown()` passes `[field]` to Prisma's `groupBy` dynamically. While `field` is derived from the typed `groupBy` parameter, the intermediate `const field = groupBy === 'status' ? 'status' : groupBy` line is redundant (it returns `groupBy` in all cases). No security risk, but confusing. | -- |

**Suggested Fix for A-01**:
```typescript
// Use Prisma $queryRaw with date_trunc for server-side bucketing
const results = await this.prisma.$queryRaw`
  SELECT date_trunc(${period}, "created_at") as bucket,
         SUM(amount) as volume,
         COUNT(*) as count
  FROM payment_sessions
  WHERE user_id = ${userId}
    AND status = 'COMPLETED'
    AND created_at >= ${since}
  GROUP BY bucket
  ORDER BY bucket ASC
`;
```

---

### 2. `audit-log.service.ts` (201 lines)

**Purpose**: Audit trail for security-critical administrative actions. Supports DB persistence with in-memory fallback.

#### Security Controls
- **Sensitive field redaction**: `redactDetails()` (line 57) recursively redacts keys matching `password`, `secret`, `token`, `key`, `authorization`. Case-insensitive matching via `toLowerCase()`.
- **Fire-and-forget design**: `record()` never throws, preventing audit logging from blocking the audited operation.

#### What's Working Well
- **Ring buffer**: In-memory buffer capped at 10,000 entries with FIFO eviction (line 80-81). Prevents memory exhaustion.
- **Dual-mode**: Graceful degradation from DB to in-memory when Prisma is unavailable.
- **Deep redaction**: Handles nested objects recursively (line 66-71).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| AL-01 | **Critical** | 100-134 | `record()` returns `void | Promise<void>`. When Prisma is available, it returns a Promise but does NOT push to in-memory as a default. The `.then()` on line 121 skips in-memory, and `.catch()` on line 123 falls back to in-memory. But if the caller does NOT `await` the returned promise (common with fire-and-forget), an unhandled rejection occurs on DB failure AND the in-memory fallback inside `.catch()` executes asynchronously -- potentially after the request has completed. The entry is NOT lost, but the return type `void | Promise<void>` makes it easy for callers to accidentally not await. | CWE-778 (Insufficient Logging) |
| AL-02 | **High** | 153-200 | `query()` has no pagination (no `take`/`skip` or `LIMIT`). A query with no filters returns ALL audit log entries. For a production system with millions of entries, this causes OOM and potential DoS. | CWE-400 |
| AL-03 | **Medium** | 155 | `const where: any = {}` -- the Prisma where clause is typed as `any`, bypassing type safety. Should use `Prisma.AuditLogWhereInput`. | CWE-1321 |
| AL-04 | **Low** | 68-71 | `redactDetails()` does not handle arrays. An array value containing sensitive objects (e.g., `{ headers: [{ authorization: "Bearer xxx" }] }`) would pass through unredacted. | CWE-532 (Insertion of Sensitive Information into Log File) |

**Suggested Fix for AL-01**:
```typescript
// Always push to in-memory as fallback, then attempt DB write
record(input: AuditRecordInput): void {
  const redactedDetails = input.details ? redactDetails(input.details) : undefined;
  const entry: AuditEntry = { ...input, details: redactedDetails, timestamp: new Date() };

  // Always capture in-memory first (guaranteed)
  this.pushBounded(entry);

  // Attempt DB persistence asynchronously (best-effort)
  if (this.prisma) {
    this.prisma.auditLog.create({ data: { ... } })
      .catch((error) => logger.error('Audit log DB write failed', error));
  }
}
```

**Suggested Fix for AL-02**: Add pagination with sensible defaults:
```typescript
query(filters: AuditQueryFilters & { limit?: number; offset?: number }): ...
// In DB path:
take: Math.min(filters.limit || 100, 1000),
skip: Math.max(filters.offset || 0, 0),
```

---

### 3. `blockchain-monitor.service.ts` (318 lines)

**Purpose**: On-chain payment verification: transaction receipt inspection, Transfer event parsing, confirmation counting.

#### Security Controls
- **RPC timeout**: `withTimeout()` wrapper (line 41) prevents indefinite blocking on hung RPC nodes. Default 15s. Tagged as RISK-045.
- **Exact amount matching**: Uses `Decimal.js` for amount comparison (line 191-197). Accepts exact or overpayment only -- no underpayment tolerance.
- **Sender verification**: Validates `fromAddress` against `customerAddress` when provided (line 216-231).

#### What's Working Well
- **`weiToUsd()` precision**: Exported helper uses `Decimal.js` for exact wei-to-USD conversion (line 65-67). No floating-point errors.
- **Multi-transfer handling**: Correctly handles transactions with multiple Transfer events (fee transfers, multi-sends) by iterating all logs and matching on both recipient AND amount (line 188-203).
- **Provider failover**: Uses `ProviderManager` abstraction for RPC provider rotation.
- **Detailed error messages**: Verification failures include specific context (expected vs. actual amounts, confirmation counts).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| BM-01 | **Medium** | 163 | `const decimals = 6` is hardcoded. While USDC and USDT both use 6 decimals, this breaks if a token with different decimals (e.g., DAI with 18) is ever added to the platform. Should be looked up from a token registry. | CWE-1188 (Insecure Default Initialization of Resource) |
| BM-02 | **Low** | 189 | Address decoding via `'0x' + log.topics[2].slice(26)` works for standard Transfer events but does not use `ethers.AbiCoder` for proper ABI decoding. Edge case: non-standard ERC-20 implementations could emit differently formatted logs. | -- |
| BM-03 | **Low** | 279 | Error message in `AppError` includes `error.message` from the RPC provider: `'Failed to verify transaction: ' + error.message`. In production, this could leak RPC endpoint URLs or internal infrastructure details. | CWE-209 (Generation of Error Message Containing Sensitive Information) |

**Suggested Fix for BM-03**:
```typescript
throw new AppError(
  500,
  'blockchain-error',
  'Failed to verify transaction. Please try again later.'
);
// Log the full error separately:
logger.error('Transaction verification failed', { error, txHash, network });
```

---

### 4. `blockchain-query.service.ts` (139 lines)

**Purpose**: Read-only blockchain queries: gas estimation and balance lookups for refunds.

#### Security Controls
- **No direct private key access**: Uses `SignerProvider` abstraction (line 52).
- **Precision**: Uses `Decimal.js` for token unit conversion (line 89-90, 133-134).

#### What's Working Well
- **Separation of concerns**: Read-only queries cleanly separated from state-changing transaction service.
- **Lazy wallet initialization**: Wallets cached per network (line 60-67), preventing unnecessary KMS calls.

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| BQ-01 | **Medium** | 45 | `const decimals = 6` hardcoded, same as BM-01. Should come from a token registry. | CWE-1188 |
| BQ-02 | **Low** | 64 | `this.wallets.set(network, walletOrAdapter as ethers.Wallet)` -- unsafe type assertion. `KMSWalletAdapter` is not an `ethers.Wallet`, so calling wallet-specific methods would fail at runtime. The `getWallet` return type should be `ethers.Wallet | KMSWalletAdapter`. | CWE-704 (Incorrect Type Conversion) |

---

### 5. `blockchain-transaction.service.ts` (513 lines)

**Purpose**: Executes ERC-20 refund transactions on-chain with spending limits, nonce management, and provider failover.

#### Security Controls
- **Daily spending limits**: Atomic check-and-reserve via Redis `INCRBY` (line 242). Race-condition-free design.
- **Fail-closed in production**: When Redis is unavailable, production denies refunds (line 261-268). Development allows them for convenience.
- **Spend release on failure**: `releaseSpend()` called on gas estimation failure, on-chain revert, and general exceptions (lines 411, 463, 503-505).
- **Input validation**: Amount > 0 check (line 345), `ethers.isAddress()` validation (line 352).
- **KMS abstraction**: Uses `createSignerProvider()` -- never reads raw private keys directly.

#### What's Working Well
- **`dollarsToCents()` string arithmetic** (line 96-108): Avoids IEEE 754 errors like `Math.round(1.005 * 100) = 100`. Excellent financial precision.
- **ADR documentation**: Thorough inline ADR explaining spending limits, nonce management, and token address registry decisions (line 127-165).
- **Nonce management**: Optional injection via constructor -- single-instance deployments don't need Redis complexity.
- **Confirmation requirements**: Network-specific (Polygon: 12, Ethereum: 3) with proper constants (line 80-83).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| BT-01 | **Medium** | 509 | Catch block returns `error.message` to the caller: `error: error instanceof Error ? error.message : 'Unknown error'`. This could leak internal details (RPC errors, wallet errors). Should sanitize. | CWE-209 |
| BT-02 | **Medium** | 173 | `this.decimals = 6` hardcoded. Same systemic issue as BM-01 and BQ-01. | CWE-1188 |
| BT-03 | **Low** | 195-197 | `DAILY_REFUND_LIMIT` parsed from env var without validation: `Number(envLimit)`. If `DAILY_REFUND_LIMIT=abc`, `Number("abc")` returns `NaN`, and all comparisons with `NaN` return `false`, effectively disabling the spending limit. | CWE-20 (Improper Input Validation) |

**Suggested Fix for BT-03**:
```typescript
const envLimit = process.env.DAILY_REFUND_LIMIT;
if (envLimit) {
  const parsed = Number(envLimit);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid DAILY_REFUND_LIMIT: "${envLimit}" must be a positive number`);
  }
  this.dailyRefundLimit = parsed;
} else {
  this.dailyRefundLimit = DEFAULT_DAILY_REFUND_LIMIT;
}
```

---

### 6. `email.service.ts` (545 lines)

**Purpose**: Email notifications for payment receipts and merchant notifications.

#### Security Controls
- **XSS prevention**: `escapeHtml()` (line 68-75) applied to all user-controlled values before HTML interpolation. Covers `&`, `<`, `>`, `"`, `'`.
- **Output encoding**: All dynamic values in HTML templates go through `escapeHtml()` consistently.

#### What's Working Well
- **Template quality**: Professional, responsive HTML email templates with proper styling.
- **Notification preferences**: Database-backed per-user preferences with auto-created defaults and upsert support.
- **Consistent escaping**: Every user-controlled string is escaped before interpolation -- no missed fields.

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| EM-01 | **High** | 526-544 | `sendEmail()` is a complete no-op. It logs "Email sent" and returns `true`, but never actually sends any email. In production, payment receipts and merchant notifications are silently swallowed. This is documented as "In production: Would send via SMTP", but there is no implementation. Any business flow depending on email delivery (e.g., receipt confirmation, failed payment alerts) silently fails. | CWE-778 (Insufficient Logging) -- misleading audit trail |
| EM-02 | **Medium** | 322 | `${amount.toFixed(2)}` in the HTML template -- `amount` is a `number` parameter. If a non-number is passed (due to upstream type coercion), `.toFixed()` throws. No defensive check. | CWE-754 (Improper Check for Unusual or Exceptional Conditions) |
| EM-03 | **Low** | 103 | Email subject includes merchant name without length limit: `Payment Receipt - ${params.merchantName}`. Very long merchant names could cause email client rendering issues but not a security vulnerability. | -- |

**Suggested Fix for EM-01**: At minimum, add a clear log warning that email delivery is stubbed:
```typescript
private async sendEmail(message: EmailMessage): Promise<boolean> {
  if (!process.env.SMTP_HOST) {
    logger.warn('Email delivery STUBBED - no SMTP configured', {
      to: message.to,
      subject: message.subject,
    });
    return false; // Return false to indicate email was NOT actually sent
  }
  // ... real SMTP implementation
}
```

---

### 7. `kms.service.ts` (267 lines)

**Purpose**: AWS KMS key management, Ethereum address derivation, health checks, and key rotation.

#### Security Controls
- **Key ID validation**: Constructor validates `config.keyId` is present (line 74).
- **Error sanitization**: Uses `sanitizeKmsError()` which strips AWS implementation details in production (line 34-39 of `kms-signing.service.ts`).
- **Audit logging**: Every sign operation logged with truncated key ID (line 156-158, 164-167).
- **Key rotation support**: `rotateKey()` clears all caches and re-creates signing service (line 212-220).

#### What's Working Well
- **Thorough ADR**: Inline ADR explaining why KMS over env vars, why recovery parameter calculation is needed, and why health checks verify both operations (line 27-64).
- **Public key caching**: Avoids redundant KMS API calls (line 97-99, 121-123).
- **Public key validation**: Verifies 65-byte uncompressed key format with `0x04` prefix (line 139-141).
- **Partial key ID logging**: Only first 8 chars of key ID logged (line 157) -- prevents full key ID exposure.

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| KMS-01 | **Medium** | 225-232 | `isKeyHealthy()` only checks `getPublicKey()`, not signing. The ADR (line 47-53) explicitly states both operations should be checked because permissions differ. The `healthCheck()` method has the same limitation. This means a key with revoked `kms:Sign` permission would report as healthy. | CWE-754 |
| KMS-02 | **Low** | 86 | `requestHandler: { requestTimeout: config.timeout || 30000 } as any` -- `as any` cast suppresses type checking on the KMS client configuration. If the SDK changes this interface, the error would be silent. | CWE-704 |

**Suggested Fix for KMS-01**:
```typescript
async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
  try {
    await this.getPublicKey();
    // Also verify signing works with a test message
    const testHash = ethers.keccak256(Buffer.from('healthcheck'));
    await this.sign(testHash);
    return { status: 'healthy', message: 'KMS connection and signing verified' };
  } catch (error) {
    return { status: 'unhealthy', message: error instanceof Error ? error.message : String(error) };
  }
}
```

---

### 8. `kms-signing.service.ts` (171 lines)

**Purpose**: ECDSA signing via AWS KMS -- raw message hash signing and Ethereum transaction signing.

#### Security Controls
- **Message hash validation**: Verifies `0x` prefix and 66-char length (32 bytes) before signing (line 61).
- **EIP-2 compliance**: Normalizes `s` value to lower half of curve order (line 87-89) to prevent signature malleability.
- **Error sanitization**: `sanitizeKmsError()` strips details in production (line 31-40).
- **Recovery parameter brute force**: Tries both v=27 and v=28, validates against known address (line 145-170).

#### What's Working Well
- **Correct ASN.1 DER decoding**: Properly parses KMS DER-encoded ECDSA signatures using `asn1.js` (line 20-22, 81).
- **Proper padding**: `r` and `s` values padded to 64 hex chars (line 94-95).
- **secp256k1 constants**: Curve order and half-N defined correctly (line 25-26).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| KS-01 | **Low** | 121 | `chainId: transaction.chainId || 137` -- defaults to Polygon's chain ID (137). If a caller forgets to specify chain ID for Ethereum transactions, the signed transaction targets the wrong network. Should require explicit chain ID. | CWE-1188 |

---

### 9. `kms-signer.service.ts` (133 lines)

**Purpose**: Abstraction layer providing either KMS-backed or env-var-backed wallet signing.

#### Security Controls
- **Production guard**: `EnvVarSignerProvider` blocks raw key usage in production (line 89-95).
- **Startup guard**: `createSignerProvider()` throws immediately in production when `USE_KMS !== 'true'` (line 124-129).
- **Warning on dev fallback**: Logs a warning every time env var key is used (line 97-100).
- **Key not logged**: Comment on line 107 confirms intentional omission of key from logs.

#### What's Working Well
- **Factory pattern**: Clean separation of KMS vs. env var providers behind `SignerProvider` interface.
- **Fail-fast**: Application refuses to start in production without KMS, rather than failing on first payment.
- **Adapter pattern**: `KMSWalletAdapter` wraps KMS to provide wallet-like interface.

#### Findings

No security findings. This service is well-designed.

---

### 10. `nonce-manager.service.ts` (168 lines)

**Purpose**: Redis-backed distributed nonce management to prevent concurrent transactions from using the same nonce.

#### Security Controls
- **Distributed lock**: Redis `SET NX PX` for lock acquisition (line 73-78).
- **Atomic unlock**: Lua `compare-and-delete` script prevents TOCTOU race on lock release (line 38-43).
- **Lock timeout**: 30-second default prevents deadlocks from crashed processes (line 45).
- **No non-atomic fallback**: Explicitly refuses to fall back to GET+DEL when Lua fails (line 124-133). Instead, lets lock expire via TTL. This is the correct decision.

#### What's Working Well
- **Thorough inline documentation**: Every design decision explained with security rationale.
- **Safe lock ownership**: Random UUID lock value ensures only the lock owner can release (line 70).
- **Nonce gap handling**: Takes `Math.max(pendingNonce, trackedNonce + 1)` to handle gaps (line 98-101).
- **Reset capability**: `resetNonce()` for manual intervention on stuck transactions (line 162).

#### Findings

No security findings. This is one of the best-engineered services in the codebase.

---

### 11. `payment.service.ts` (318 lines)

**Purpose**: Core payment session lifecycle: creation, listing, status transitions with pessimistic locking.

#### Security Controls
- **Tenant isolation**: All queries filter by `userId` (line 68, 89).
- **Pessimistic locking**: `SELECT ... FOR UPDATE` inside `$transaction` for status updates (line 171-175).
- **State machine enforcement**: `validatePaymentStatusTransition()` called before every status change (line 183).
- **Expiry enforcement**: Expired sessions cannot transition to CONFIRMING or COMPLETED (line 186-201).
- **Webhook outside transaction**: Webhook queuing happens after transaction commit to avoid holding locks during HTTP calls (line 232+).

#### What's Working Well
- **Excellent ADR**: The inline ADR (line 123-157) explains the locking strategy, why webhooks are outside the transaction, idempotent same-state transitions, and alternatives considered. This is production-grade documentation.
- **Pagination safety**: `Math.min(filters.limit || 50, 100)` caps pagination (line 113).
- **Idempotency key**: Passed through to Prisma for DB-level deduplication (line 43).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| PS-01 | **Medium** | 158-167 | `updatePaymentStatus()` does not accept `userId` parameter. Any caller with a valid payment session ID can update its status. While this is intended for internal use (blockchain events), a route handler that exposes this method would create a BOLA vulnerability. The method should accept an optional `userId` like `processRefund()` does. | CWE-639 (Authorization Bypass Through User-Controlled Key) |
| PS-02 | **Low** | 203 | `const data: any = { status }` -- typed as `any`, losing Prisma type safety. | CWE-704 |

**Suggested Fix for PS-01**:
```typescript
async updatePaymentStatus(
  id: string,
  userId: string | undefined, // Required from routes, optional from internal callers
  status: PaymentStatus,
  updates: { ... }
): Promise<PaymentSession> {
  // Add userId to FOR UPDATE WHERE clause when provided
}
```

---

### 12. `payment-link.service.ts` (351 lines)

**Purpose**: Payment link management with short code generation, usage tracking, and expiry.

#### Security Controls
- **Ownership verification**: `getPaymentLink()` filters by both `id` AND `userId` (line 152-153).
- **Atomic usage increment**: Raw SQL `UPDATE ... WHERE ... AND usageCount < maxUsages` prevents race condition on concurrent usage (line 312-320). Tagged as RISK-064.
- **Immutable fields**: Amount, network, token, and merchant_address cannot be updated after creation (documented on line 234).
- **Short code collision retry**: Up to 5 retries on P2002 unique constraint violation (line 96-146).

#### What's Working Well
- **Cryptographic short codes**: `crypto.randomBytes(5)` for 40 bits of entropy in short codes (line 13). Base62 encoding produces URL-friendly codes.
- **Active/expired/max-usage guards**: `getPaymentLinkByShortCode()` validates all three conditions (line 177-191).
- **Pagination capped**: `Math.min(filters.limit || 50, 100)` (line 223).
- **Ownership on increment**: `userId` required in `incrementUsage()` WHERE clause (line 315).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| PL-01 | **Low** | 345 | `payment_url: \`${baseUrl}/pay/${link.shortCode}\`` -- `baseUrl` is not validated. If it contains user-controlled input, this could create an open redirect. In practice, `baseUrl` comes from server config, but defensive validation would be prudent. | CWE-601 (URL Redirection to Untrusted Site) |
| PL-02 | **Low** | 113 | `metadata: data.metadata as any` -- Prisma `Json` type requires explicit cast, but this loses type safety. Consider using `Prisma.InputJsonValue`. | -- |

---

### 13. `refund.service.ts` (407 lines)

**Purpose**: Refund facade -- creation, processing, and delegation to query/finalization sub-services.

#### Security Controls
- **Over-refund prevention**: `FOR UPDATE` lock on payment row + `Decimal.js` arithmetic to calculate remaining refundable amount (line 163-216).
- **Idempotency**: Unique constraint on `(paymentSessionId, idempotencyKey)` with parameter-mismatch detection (line 136-161).
- **BOLA protection**: `processRefund()` accepts optional `userId` and documents when it MUST be provided (line 252-263).
- **Status guards**: Only COMPLETED/REFUNDED payments can be refunded (line 179-186). Only PENDING/PROCESSING refunds can be processed (line 280-283).

#### What's Working Well
- **Decimal.js throughout**: `computeRefundedTotal()` and `computeRemainingAmount()` use exact arithmetic.
- **Excellent ADR**: Inline ADR (line 82-116) explains locking strategy, idempotency check placement, Decimal.js vs native numbers, and alternatives.
- **Idempotency check outside transaction**: Reduces lock contention under retry storms (documented in ADR, line 92-97).
- **Production guard**: Throws if `BlockchainTransactionService` fails to initialize in production (line 61-67).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| RS-01 | **Medium** | 294-299 | Status transition from PENDING to PROCESSING (line 294-298) is NOT protected by a transaction or row lock. If two concurrent callers both reach this point for the same refund, both will update to PROCESSING and both will call `executeRefund()`. The `processRefund()` method should use `FOR UPDATE` here, similar to how the worker does it. | CWE-362 (Concurrent Execution Using Shared Resource with Improper Synchronization) |
| RS-02 | **Low** | 335 | `result.error` from `executeRefund()` is propagated to the webhook payload and the AppError message. This could leak blockchain infrastructure details to merchant webhook endpoints. | CWE-209 |

**Suggested Fix for RS-01**:
```typescript
// Wrap the PENDING -> PROCESSING transition in a transaction with FOR UPDATE
const lockedRefund = await this.prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw`
    SELECT * FROM "refunds" WHERE id = ${id} FOR UPDATE
  `;
  if (rows[0].status !== 'PENDING') {
    throw new AppError(400, 'invalid-refund-status', '...');
  }
  return tx.refund.update({ where: { id }, data: { status: 'PROCESSING' } });
});
```

---

### 14. `refund-query.service.ts` (113 lines)

**Purpose**: Read-only refund queries with ownership verification.

#### Security Controls
- **Ownership verification**: `getRefund()` filters through `paymentSession.userId` (line 32-34).
- **Pagination capped**: `Math.min(filters.limit || 50, 100)` (line 88).

#### What's Working Well
- **Clean separation**: Pure read-only service with no side effects.
- **Type-safe response mapping**: `toResponse()` converts Prisma model to API format (line 100-112).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| RQ-01 | **Low** | 60 | `const where: any = { ... }` -- typed as `any`. Should use `Prisma.RefundWhereInput`. | CWE-704 |

---

### 15. `refund-finalization.service.ts` (377 lines)

**Purpose**: Refund completion, failure handling, finality confirmation, and payment status updates.

#### Security Controls
- **FOR UPDATE locking**: `completeRefund()` uses `FOR UPDATE OF r` to prevent concurrent double-completion (line 68-81).
- **Status guards**: Cannot fail a COMPLETED refund (line 153), cannot complete a non-PROCESSING refund (line 93-95).
- **Idempotent finality**: `confirmRefundFinality()` handles already-completed refunds gracefully (line 240-242).
- **Atomic payment status update**: `updatePaymentStatusIfFullyRefunded()` uses `FOR UPDATE` on payment row (line 309-314).

#### What's Working Well
- **Decimal.js for refund total**: `computeRefundedTotal()` and `computeRemainingAmount()` are pure functions using exact arithmetic.
- **ADR on every method**: Each method has an ADR explaining why the locking strategy was chosen and what race condition it prevents.
- **Transaction timeouts**: All `$transaction()` calls include `{ timeout: 10000 }` to prevent indefinite hangs (line 107, 166, 262, 354).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| RF-01 | **Medium** | 63 | `completeRefund()` parameter `userId` is optional. The ADR (line 58-62) explains this is intentional for internal callers, but the method signature makes it easy for a route handler to forget to pass `userId`, creating a BOLA vulnerability. Consider making `userId` required and having internal callers pass a system-level constant. | CWE-639 |

---

### 16. `webhook.service.ts` (136 lines)

**Purpose**: Webhook signature generation and verification using HMAC-SHA256.

#### Security Controls
- **Timing-safe comparison**: Uses `crypto.timingSafeEqual` via `verifyWebhookSignature()` (line 69). Tagged as CWE-208 prevention.
- **Replay attack prevention**: Timestamp validation within 5-minute window (line 75-90).
- **Future timestamp rejection**: Prevents clock-skew attacks (line 80).

#### What's Working Well
- **Stripe-style signature scheme**: `HMAC-SHA256(timestamp.payload, secret)` -- industry standard.
- **Complete verification pipeline**: `verifyWebhook()` checks signature presence, timestamp presence, timestamp freshness, and signature validity in order (line 113-135).
- **Specific error codes**: Returns typed error enum (`missing_signature`, `missing_timestamp`, `expired_timestamp`, `invalid_signature`).

#### Findings

No security findings. This service follows cryptographic best practices.

---

### 17. `webhook-delivery.service.ts` (281 lines)

**Purpose**: Webhook queuing facade with idempotent delivery creation and concurrent queue processing.

#### Security Controls
- **Idempotent queuing**: Composite unique constraint `(endpoint_id, event_type, resource_id)` prevents duplicate deliveries (line 130-163).
- **FOR UPDATE SKIP LOCKED**: Concurrent worker safety for queue processing (line 221).
- **Concurrency limit**: Configurable `concurrencyLimit` parameter (default 10) on `processQueue()` (line 186).

#### What's Working Well
- **ADR**: Thorough explanation of circuit breaker atomicity, HMAC signatures, and exponential backoff (line 36-71).
- **Claim-then-process pattern**: Deliveries are claimed (marked DELIVERING) inside a short transaction, then processed outside it -- avoiding long-held locks during HTTP calls (line 193-238).
- **P2002 handling**: Prisma unique constraint violation caught and treated as idempotent success (line 148-163).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| WD-01 | **Medium** | 194 | `const deliveries: any[] = await tx.$queryRaw` -- raw query results typed as `any[]`. Column names use PostgreSQL snake_case but are aliased with camelCase. If any alias is wrong, the error is silent (undefined values). Should define a proper interface for the raw query result. | CWE-704 |
| WD-02 | **Low** | 270-271 | `getDeliveryStatus()` returns `any`. Should have a proper return type. | CWE-704 |

---

### 18. `webhook-delivery-executor.service.ts` (325 lines)

**Purpose**: Individual webhook delivery: secret decryption, HMAC signing, HTTP sending, retry scheduling.

#### Security Controls
- **SSRF protection**: `validateWebhookUrl()` called before every delivery (line 142).
- **Webhook secret caching**: TTL-based in-memory cache (5 minutes) for decrypted secrets (line 31-64). Bounded at 1,000 entries (RISK-063).
- **Circuit breaker integration**: Checks circuit state before delivery, records success/failure after (line 121-129, 225, 235).
- **Request timeout**: `AbortSignal.timeout(30000)` on fetch calls (line 201).
- **Response body truncation**: Limited to 10,000 chars (line 213, 276).
- **Error message truncation**: Limited to 1,000 chars (line 277, 295).

#### What's Working Well
- **Retry with jitter**: 10% random jitter on retry delays to prevent thundering herd (line 266-268). Tagged as RISK-076.
- **Exponential backoff**: 1m, 5m, 15m, 1h, 2h schedule (line 108).
- **Secret cache eviction**: Both expired-entry cleanup and LRU-style oldest-entry eviction (line 47-65).
- **Cache invalidation API**: `invalidateSecretCache()` for key rotation scenarios (line 88-90). Tagged as RISK-066.
- **Webhook headers**: Includes signature, timestamp, delivery ID, and user-agent (line 194-199).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| WDE-01 | **High** | 118 | `async deliverWebhook(delivery: any)` -- the entire delivery parameter is typed as `any`. This means there is zero compile-time verification that the required properties (`id`, `endpoint`, `payload`, `attempts`) exist. A caller passing a malformed object would fail at runtime with a confusing error. | CWE-704 |
| WDE-02 | **Medium** | 142-159 | SSRF TOCTOU gap: `validateWebhookUrl()` resolves DNS and checks for private IPs, but `fetch()` on line 191 performs its own DNS resolution. Between validation and fetch, DNS could resolve to a different (private) IP. Mitigation: use the resolved IPs directly in the fetch call, or implement a custom DNS resolver that pins the validated IPs. | CWE-367 (TOCTOU Race Condition) |
| WDE-03 | **Low** | 48-59 | Secret cache eviction has a minor race window: `secretCache.size >= MAX_SECRET_CACHE_SIZE` is checked, then `evictExpiredSecrets()` is called, then size is checked again. In a single-threaded Node.js runtime this is safe, but the pattern is fragile if the code is ever refactored to use workers. | -- |

**Suggested Fix for WDE-01**:
```typescript
interface WebhookDeliveryPayload {
  id: string;
  endpoint: { id: string; url: string; secret: string; userId: string };
  payload: Record<string, any>;
  attempts: number;
  eventType: string;
}

async deliverWebhook(delivery: WebhookDeliveryPayload): Promise<void> { ... }
```

**Suggested Fix for WDE-02**:
```typescript
// Pin resolved IPs by using a custom agent or undici dispatcher
// that forces the connection to the pre-validated IPs
import { Agent } from 'undici';
const resolvedIPs = await validateWebhookUrl(endpoint.url);
const agent = new Agent({ connect: { lookup: (_, __, cb) => cb(null, resolvedIPs) } });
const response = await fetch(endpoint.url, { dispatcher: agent, ... });
```

---

### 19. `webhook-circuit-breaker.service.ts` (101 lines)

**Purpose**: Redis-backed circuit breaker for webhook endpoints. Opens after 10 consecutive failures, resets after 5-minute cooldown.

#### Security Controls
- **Atomic Lua script**: `INCR + EXPIRE + conditional SET` in a single atomic operation (line 30-37).
- **Non-atomic fallback**: Graceful degradation when Redis does not support EVAL (line 77-89).
- **Null Redis safety**: All methods return safe defaults when Redis is null (lines 45, 64, 97).

#### What's Working Well
- **Complete circuit lifecycle**: `recordFailure()` increments and opens, `recordSuccess()` resets, `isCircuitOpen()` checks with cooldown expiry.
- **Clean interface**: `RedisLike` interface (line 12-18) makes the service testable with any Redis-compatible client.
- **Self-healing**: Circuit auto-resets after cooldown (line 54-57).

#### Findings

No security findings. Well-designed and minimal.

---

### 20. `refund-processing.worker.ts` (227 lines)

**Purpose**: Background worker that polls for PENDING refunds and processes them via `RefundService.processRefund()`.

#### Security Controls
- **Distributed lock**: Redis `SET NX PX` prevents multiple instances from processing simultaneously (line 62-68).
- **Atomic unlock**: Lua `compare-and-delete` script (line 147-152).
- **FOR UPDATE SKIP LOCKED**: Row-level claim safety within the transaction (line 91).
- **Batch size cap**: 10 refunds per run to avoid overwhelming blockchain service (line 25).

#### What's Working Well
- **Claim-then-process pattern**: Short DB transaction for claiming, long blockchain calls outside it (line 83-110 vs 121-132).
- **Graceful Redis fallback**: Falls back to unlocked `findMany` with warning when Redis is unavailable (line 51-56, 160-193).
- **Individual error isolation**: Each refund wrapped in try/catch so one failure does not block others (line 122-132).
- **Start/stop lifecycle**: Clean interval management with idempotent `start()` and `stop()` (line 199-225).

#### Findings

| # | Severity | Line | Finding | OWASP/CWE |
|---|----------|------|---------|-----------|
| RPW-01 | **High** | 147-152 | The Redis Lua eval for lock release is NOT wrapped in try/catch. If Redis is disconnected between the processing phase (line 121-132) and the finally block (line 144), the `eval` call will throw an unhandled exception, which will be caught by the outer try/catch on line 139 -- but by that point, processing results are already committed. More critically, if `this.redis.eval` throws, the lock is not released at all (it must wait for TTL expiry). Unlike `nonce-manager.service.ts` which correctly handles Lua eval failure with a warning log, the worker just lets it propagate. | CWE-755 (Improper Handling of Exceptional Conditions) |
| RPW-02 | **Medium** | 31 | `private redis: any | null` -- Redis client typed as `any`. Should use `RedisLike` interface or `import Redis from 'ioredis'`. | CWE-704 |
| RPW-03 | **Low** | 160-193 | `processPendingRefundsUnlocked()` does not use FOR UPDATE SKIP LOCKED, meaning in single-instance mode without Redis, two overlapping invocations (e.g., if processing takes longer than `INTERVAL_MS`) could both pick up the same PENDING refunds. The `processRefund()` method's internal status check would catch this, but it wastes blockchain calls. | CWE-362 |

**Suggested Fix for RPW-01**:
```typescript
} finally {
  try {
    await this.redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1, lockKey, lockValue,
    );
  } catch (unlockError) {
    logger.warn('Failed to release refund worker lock; will expire via TTL', {
      error: unlockError,
      lockKey,
      lockTtlMs: LOCK_TTL_MS,
    });
  }
}
```

---

## Cross-Cutting Findings

### Hardcoded Decimals (Systemic)

**Files**: `blockchain-monitor.service.ts:163`, `blockchain-query.service.ts:45`, `blockchain-transaction.service.ts:173`

**Severity**: Medium

All three blockchain services hardcode `decimals = 6` for token precision. While USDC and USDT both use 6 decimals, this becomes a breaking bug if any token with different decimals is added (e.g., DAI = 18, WETH = 18). A central token registry should map `(network, token) -> decimals`.

**Suggested Fix**: Add to `constants/tokens.ts`:
```typescript
export const TOKEN_DECIMALS: Record<Token, number> = {
  USDC: 6,
  USDT: 6,
};
```

### `any` Type Usage (Systemic)

**Files**: Multiple (tagged in individual findings as CWE-704)

At least 8 instances of `any` typing that bypass TypeScript's type safety: Prisma where clauses, raw query results, webhook delivery payloads, Redis client type, Prisma update data objects. While none of these are security vulnerabilities on their own, they reduce the compiler's ability to catch bugs.

### Secrets Handling -- GOOD

No hardcoded secrets, tokens, or API keys found in any service file. All secrets come from:
- Environment variables (`WEBHOOK_ENCRYPTION_KEY`, `API_KEY_HMAC_SECRET`, `KMS_KEY_ID`, `MERCHANT_WALLET_PRIVATE_KEY`)
- Database (webhook endpoint secrets, encrypted at rest)
- AWS KMS (signing keys never leave HSM)

The `MERCHANT_WALLET_PRIVATE_KEY` env var is blocked in production by the `EnvVarSignerProvider` guard.

### PII Handling -- GOOD

- **Email addresses**: Only used in `email.service.ts` for sending; not logged with PII.
- **Wallet addresses**: Logged in blockchain services for operational debugging. These are pseudonymous (not directly PII) but could be correlated. Consider masking in logs: `0x742d...0bEb`.
- **Audit log redaction**: Sensitive keys (`password`, `secret`, `token`, `key`, `authorization`) are redacted before storage.
- **Webhook payload data**: Contains payment amounts and wallet addresses but not customer PII (emails, names).

### Error Handling -- RFC 7807 Compliance

All services use `AppError` with `statusCode`, `code`, and `message`. The `toJSON()` method on `AppError` produces RFC 7807-compatible output. Error messages from external systems (RPC, KMS, blockchain) are sanitized in production via `sanitizeKmsError()` and similar patterns. Three instances (BT-01, BM-03, RS-02) where internal error details could leak through to API responses or webhook payloads.

### Race Condition Protection -- EXCELLENT

The codebase demonstrates exceptional awareness of concurrency issues:

| Mechanism | Used In | Purpose |
|-----------|---------|---------|
| `SELECT ... FOR UPDATE` | `payment.service.ts`, `refund.service.ts`, `refund-finalization.service.ts` | Prevent concurrent state transitions |
| `FOR UPDATE SKIP LOCKED` | `webhook-delivery.service.ts`, `refund-processing.worker.ts` | Concurrent worker queue safety |
| `UPDATE ... WHERE condition` (atomic) | `payment-link.service.ts:incrementUsage` | Prevent over-usage without locks |
| Redis `SET NX PX` | `nonce-manager.service.ts`, `refund-processing.worker.ts` | Distributed mutual exclusion |
| Lua atomic scripts | `nonce-manager.service.ts`, `webhook-circuit-breaker.service.ts`, `refund-processing.worker.ts` | Atomic compare-and-delete, atomic increment-and-check |
| Redis `INCRBY` (atomic) | `blockchain-transaction.service.ts:checkAndReserveSpend` | Race-free spending limit enforcement |

### Data Integrity -- EXCELLENT

- **Decimal.js** used for all monetary arithmetic (`refund.service.ts`, `refund-finalization.service.ts`, `blockchain-monitor.service.ts`, `blockchain-query.service.ts`).
- **Integer-cent accumulation** in `analytics.service.ts` to avoid float drift in long summation.
- **String-based `dollarsToCents()`** in `blockchain-transaction.service.ts` to avoid `Math.round()` precision errors.
- **Transaction timeouts** on all `$transaction()` calls (10 seconds) to prevent indefinite hangs.

---

## Summary of All Findings

| ID | File | Severity | Description |
|----|------|----------|-------------|
| AL-01 | `audit-log.service.ts:100` | **Critical** | `record()` return type ambiguity can cause audit entries to be lost |
| WDE-01 | `webhook-delivery-executor.service.ts:118` | **High** | `delivery` parameter typed as `any` -- no compile-time safety |
| WDE-02 | `webhook-delivery-executor.service.ts:142` | **High** | SSRF TOCTOU gap between DNS validation and fetch |
| AL-02 | `audit-log.service.ts:153` | **High** | No pagination on audit log queries -- potential OOM/DoS |
| EM-01 | `email.service.ts:526` | **High** | `sendEmail()` is a no-op -- silently swallows all emails |
| RPW-01 | `refund-processing.worker.ts:147` | **High** | Lock release Lua eval not wrapped in try/catch |
| PS-01 | `payment.service.ts:158` | **Medium** | `updatePaymentStatus()` missing `userId` -- potential BOLA |
| RS-01 | `refund.service.ts:294` | **Medium** | PENDING->PROCESSING transition not locked -- potential double-execution |
| RF-01 | `refund-finalization.service.ts:63` | **Medium** | Optional `userId` on `completeRefund()` -- BOLA risk from route handlers |
| BM-01 | `blockchain-monitor.service.ts:163` | **Medium** | Hardcoded `decimals = 6` |
| BQ-01 | `blockchain-query.service.ts:45` | **Medium** | Hardcoded `decimals = 6` |
| BT-01 | `blockchain-transaction.service.ts:509` | **Medium** | Error message leaks internal details |
| BT-02 | `blockchain-transaction.service.ts:173` | **Medium** | Hardcoded `decimals = 6` |
| BT-03 | `blockchain-transaction.service.ts:195` | **Low** | `DAILY_REFUND_LIMIT` parsed without NaN validation |
| AL-03 | `audit-log.service.ts:155` | **Medium** | Prisma where clause typed as `any` |
| KMS-01 | `kms.service.ts:225` | **Medium** | Health check only validates getPublicKey, not signing |
| WD-01 | `webhook-delivery.service.ts:194` | **Medium** | Raw query result typed as `any[]` |
| EM-02 | `email.service.ts:322` | **Medium** | No defensive check on `amount.toFixed()` |
| RPW-02 | `refund-processing.worker.ts:31` | **Medium** | Redis typed as `any` |
| A-01 | `analytics.service.ts:71` | **Low** | In-memory bucketing for large datasets -- OOM risk |
| A-02 | `analytics.service.ts:107` | **Low** | Redundant field assignment |
| AL-04 | `audit-log.service.ts:68` | **Low** | Array values not redacted |
| BM-02 | `blockchain-monitor.service.ts:189` | **Low** | Manual ABI decoding instead of ethers AbiCoder |
| BM-03 | `blockchain-monitor.service.ts:279` | **Low** | RPC error message in AppError |
| BQ-02 | `blockchain-query.service.ts:64` | **Low** | Unsafe type assertion |
| KMS-02 | `kms.service.ts:86` | **Low** | `as any` on KMS client config |
| KS-01 | `kms-signing.service.ts:121` | **Low** | Default chainId 137 could cause wrong-network signing |
| PL-01 | `payment-link.service.ts:345` | **Low** | `baseUrl` not validated |
| PL-02 | `payment-link.service.ts:113` | **Low** | Metadata cast to `any` |
| PS-02 | `payment.service.ts:203` | **Low** | Update data typed as `any` |
| RQ-01 | `refund-query.service.ts:60` | **Low** | Where clause typed as `any` |
| RS-02 | `refund.service.ts:335` | **Low** | Blockchain error in webhook payload |
| WD-02 | `webhook-delivery.service.ts:270` | **Low** | Return type `any` |
| EM-03 | `email.service.ts:103` | **Low** | No length limit on email subject |
| RPW-03 | `refund-processing.worker.ts:160` | **Low** | Unlocked fallback could process same refund twice |
| WDE-03 | `webhook-delivery-executor.service.ts:48` | **Low** | Cache eviction race (safe in single-threaded Node.js) |

---

## What Is Working WELL (Patterns to Preserve)

1. **Pessimistic locking with ADRs**: Every `SELECT ... FOR UPDATE` is accompanied by an inline ADR explaining the race condition it prevents and alternatives considered. This is exceptional documentation practice.

2. **Decimal.js for monetary arithmetic**: Consistent use across all services that handle money. No instances of `Number` arithmetic on payment amounts.

3. **KMS key management**: Private keys never leave the HSM. Production guards prevent env-var fallback. Partial key ID logging.

4. **Timing-safe signature verification**: `crypto.timingSafeEqual` for webhook signature comparison (CWE-208 prevention).

5. **SSRF protection with DNS resolution**: `url-validator.ts` resolves hostnames to IPs and validates all resolved addresses against private ranges. Covers IPv4, IPv6, loopback, link-local, and cloud metadata.

6. **Atomic spending limit enforcement**: Redis `INCRBY` + rollback pattern in `checkAndReserveSpend()` eliminates race conditions. Fail-closed in production, fail-open in development.

7. **Circuit breaker with Lua atomicity**: Redis Lua script ensures circuit opens at exactly the threshold regardless of concurrency, with non-atomic fallback for compatibility.

8. **Webhook secret encryption at rest**: AES-256-GCM with proper IV, auth tag, and entropy validation on the encryption key.

9. **Nonce manager with safe unlock**: Atomic compare-and-delete Lua script prevents TOCTOU on lock release. Explicit refusal to use non-atomic GET+DEL fallback with documented rationale.

10. **Claim-then-process pattern**: Both webhook delivery and refund processing claim work items in a short transaction (`FOR UPDATE SKIP LOCKED`), then process outside the transaction. This prevents long-held database locks during slow external calls.

---

## Remediation Priority

### Immediate (before production)
1. Fix RPW-01: Wrap lock release eval in try/catch
2. Fix EM-01: Either implement SMTP or clearly surface that emails are not being sent
3. Fix AL-01: Always capture audit entries in-memory first, then attempt DB
4. Fix AL-02: Add pagination to audit log queries
5. Fix BT-03: Validate `DAILY_REFUND_LIMIT` env var is a positive number

### Short-term (next sprint)
6. Fix WDE-01: Type the webhook delivery parameter
7. Fix PS-01: Add optional `userId` to `updatePaymentStatus()`
8. Fix RS-01: Lock the PENDING->PROCESSING transition
9. Fix WDE-02: Pin DNS resolution to prevent SSRF TOCTOU
10. Fix hardcoded decimals (BM-01, BQ-01, BT-02): Create token decimals registry

### Technical debt (next quarter)
11. Eliminate all `any` types (AL-03, WD-01, RPW-02, PS-02, RQ-01, WD-02, PL-02)
12. Implement server-side volume bucketing (A-01)
13. Add array redaction to audit log (AL-04)
14. Sanitize error messages in external-facing responses (BM-03, BT-01, RS-02)
