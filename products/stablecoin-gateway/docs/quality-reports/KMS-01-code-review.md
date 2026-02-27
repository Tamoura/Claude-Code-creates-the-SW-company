# Code Review: KMS Hot Wallet Security (CODE-REVIEW-KMS-01)

**Branch**: `feature/stablecoin-gateway/kms-hot-wallet`
**Reviewer**: Code Reviewer Agent
**Date**: 2026-02-27
**Verdict**: APPROVED WITH MINOR NOTES
**Score**: 8.2/10

---

## Summary

Four security gaps (GAP-01 through GAP-04) were addressed in this PR. The implementation
is architecturally sound, follows the established service/route patterns, and the test
suite is meaningful and well-structured. All critical security properties are correctly
implemented: private keys never leave KMS, production startup is guarded, audit logs
omit sensitive material, and the rotation endpoint is auth-gated.

The issues found are minor-to-major in nature — no critical defects. The most significant
concern is that the error-path audit log is missing from `signTransaction()` and `sign()`,
meaning failures are untracked in the audit trail. This is a major gap for a security-sensitive
code path and should be addressed before merge.

---

## Per-File Findings

---

### `kms-signer.service.ts`

**Overall**: Clean, well-documented, clear responsibility separation. GAP-01 and GAP-02
are correctly implemented.

| # | Issue | Severity | Location | Suggested Fix |
|---|-------|----------|----------|---------------|
| 1 | `EnvVarSignerProvider.getWallet()` throws a plain `new Error(...)` (line 104) when `MERCHANT_WALLET_PRIVATE_KEY` is missing, instead of `AppError`. This is inconsistent with the surrounding AppError usage (line 90) and means the error won't serialise correctly through the global error handler. | **Major** | Line 104 | `throw new AppError(500, 'missing-env-key', 'MERCHANT_WALLET_PRIVATE_KEY not configured')` |
| 2 | `KMSWalletAdapter.connect()` accepts `_provider: ethers.JsonRpcProvider` but the underscore prefix is a convention meaning "intentionally unused". No comment explains *why* it returns `this` instead of creating a connected copy, which is the contract callers of `ethers.Wallet.connect()` expect. A future maintainer could mistake this as a bug. | **Note** | Line 47 | Add a one-line comment: `// KMS does not need a provider; signing occurs inside AWS. Returns self to satisfy ethers interface.` |
| 3 | The `Network` type (line 24) is defined locally here but likely used elsewhere in the codebase too. If it drifts from the canonical definition in `types/index.ts` (which already has `'polygon' \| 'ethereum'` in several interfaces), the two definitions will silently diverge. | **Minor** | Line 24 | Move `Network` to `src/types/index.ts` and import from there. |

---

### `kms.service.ts`

**Overall**: The ADR inline comment is exceptionally thorough — exactly the right level of
"why" documentation for a security-critical HSM integration. Caching, retry configuration,
and address derivation logic are all well-handled.

| # | Issue | Severity | Location | Suggested Fix |
|---|-------|----------|----------|---------------|
| 4 | `signTransaction()` and `sign()` only emit an audit log on the **success path** (lines 155–160, 165–170). If `signingService.signTransaction()` or `.sign()` throws, the failure is never recorded in the audit log. For a financial signing operation this is a significant audit gap — failed signing attempts are exactly what a security team needs to detect key misuse or infrastructure faults. | **Major** | Lines 153–171 | Wrap each in try/catch; emit a `logger.warn` or `logger.error` audit entry with `outcome: 'error'` and `errorCode: err.code` (no stack trace) before re-throwing. |
| 5 | `requestHandler: { requestTimeout: ... } as any` on line 86 uses `as any` to suppress a type error. This is an SDK version compatibility workaround, which is acceptable in isolation, but the cast silently hides whatever type mismatch exists. | **Minor** | Line 86 | Add an inline comment: `// AWS SDK v3 requestHandler type does not expose requestTimeout directly; cast is intentional pending SDK update.` Without this, the next developer who sees `as any` may either remove it (breaking timeout) or assume it is a lazy shortcut. |
| 6 | `isKeyHealthy()` (lines 197–204) and `healthCheck()` (lines 206–216) are functionally equivalent — both call `getPublicKey()` and differ only in return type. `isKeyHealthy()` is never called from within this file (it is not referenced in `admin.ts` either — only `healthCheck()` is used). | **Minor** | Lines 197–204 | Confirm whether `isKeyHealthy()` is used by any external caller. If not, remove it to avoid dead code. If it is needed, delegate: `return (await this.healthCheck()).status === 'healthy'`. |
| 7 | `getPublicKey()` throws a plain `new Error('No public key returned from KMS')` (line 133) and `new Error('Invalid public key format from KMS')` (line 141). These escape the `sanitizeKmsError` wrapper because they are thrown *before* the outer catch, meaning they will propagate as plain Errors rather than sanitised AppErrors through the service boundary. | **Minor** | Lines 133, 141 | Throw `AppError` directly, or ensure these are caught by the surrounding try/catch. The current structure *does* catch them (the throw is inside the try block), so `sanitizeKmsError` will process them — but only if `sanitizeKmsError` knows how to handle plain `Error` instances. Worth a quick verification that `sanitizeKmsError` in `kms-signing.service.ts` handles `Error` (not just AWS SDK errors). |

---

### `routes/v1/admin.ts`

**Overall**: Route pattern matches the rest of the codebase precisely (Zod validation,
AppError catch, logger.error for unhandled). Auth-gating via `onRequest` hook is correct
and consistent with peer routes. The lazy KMS singleton pattern is a pragmatic choice for
dev/test environments.

| # | Issue | Severity | Location | Suggested Fix |
|---|-------|----------|----------|---------------|
| 8 | `logger.error('KMS rotate endpoint error', error)` on line 83 passes `error` as the second argument, which the `Logger.error()` signature accepts as `Error \| unknown`. This is correct. However, on line 52, `logger.error('KMS key rotation health check failed', undefined, { ... })` passes `undefined` as the error and the structured data as the third argument. This is also correct per the signature, but passing `undefined` as the error object is semantically odd — it suggests "an error occurred" but provides no error object. | **Note** | Line 52 | Consider `logger.warn('KMS key rotation: new key unhealthy', { ... })` since this is a business-logic failure (bad key ID supplied), not an unexpected runtime error. Reserve `logger.error` for unhandled/unexpected failures. |
| 9 | The rotation endpoint updates the in-memory `kmsService` singleton but does not persist the new `newKeyId` to environment or configuration store. If the process restarts, the old key is used. This is an architectural limitation that is acceptable for an MVP endpoint but should be documented. | **Note** | Lines 42–86 | Add an inline comment on line 48 explaining that `rotateKey()` is in-memory only and the caller (DevOps) is responsible for updating `KMS_KEY_ID` in the environment/secrets manager to make rotation permanent. |
| 10 | The `POST /kms/rotate` error handler catches `ZodError`, `AppError`, and re-throws anything else (line 84). This is correct. However, unlike peer routes (e.g. `refunds.ts`), the `AppError` check comes *after* the `ZodError` check. The order is fine (Zod errors are not AppErrors), but for consistency with all other routes in this file where `AppError` is checked first, swap the order. | **Note** | Lines 72–84 | Move `AppError` check before `ZodError` check (cosmetic; no functional impact). |
| 11 | `kmsRotateBodySchema` only validates `newKeyId` as a non-empty string. There is no format validation (e.g. UUID or ARN pattern). A typo in `newKeyId` will pass validation, then `rotateKey()` mutates state, and only then `healthCheck()` reveals the key is bad — at which point the live key has already been swapped in the singleton. | **Major** | Lines 8–10, 48–50 | The `rotateKey()` + `healthCheck()` sequence is the correct mitigation (rollback is implicit since the singleton holds the new bad key until restart). However, the endpoint should swap back to the old key if `healthCheck()` fails. Currently it leaves `kmsService` pointing at the bad new key even after returning 503. Add: save the old key ID before rotating, and call `svc.rotateKey(oldKeyId)` inside the 503 branch before returning. |

---

### `tests/services/kms-audit-log.test.ts`

**Overall**: Test structure is clear, story IDs are present (`[US-KMS-02][AC-3]`), and
the assertions are meaningful — particularly the negative assertions on `r`, `s`, `v`,
and the full key ARN. The DER builder helpers make the intent readable.

| # | Issue | Severity | Location | Suggested Fix |
|---|-------|----------|----------|---------------|
| 12 | `mockKMSClient: any` on line 33. The `any` type here is understandable for a mock, but the rest of the test file carefully uses typed assertions. A local type `{ send: jest.Mock }` would be more consistent with the project's TypeScript discipline and remove the implicit escape hatch. | **Note** | Line 33 | `let mockKMSClient: { send: jest.Mock }` |
| 13 | The test `'emits structured info log on successful signTransaction'` (line 80) and `'audit log keyId is truncated...'` (line 114) are testing overlapping concerns. They share the same setup boilerplate (prime cache, build DER sig, call signTransaction) duplicated verbatim. | **Minor** | Lines 80–148 | Extract the shared setup into a `beforeEach` scoped to the `signTransaction()` describe block, or a helper function `setupSignTransaction()`, to reduce duplication and the risk of tests drifting. |
| 14 | There are no tests for the **failure path** of `signTransaction()` or `sign()`. Given that issue #4 above identifies a missing error-path audit log, corresponding tests are also absent. | **Major** | Entire file | Add tests: `'emits error audit log when signTransaction() throws'` and `'emits error audit log when sign() throws'`. These tests are needed to drive the fix for issue #4 (and would have caught the gap during TDD). |
| 15 | `buildDERSignature()` (lines 51–60) produces a structurally minimal DER envelope. It does not account for the DER high-bit rule (values with the high bit set need a leading `0x00` padding byte). For a test using a real secp256k1 key pair this may or may not matter depending on the `r`/`s` values generated. This could cause intermittent test failures on unlucky key pairs. | **Minor** | Lines 51–60 | Encode `r` and `s` with proper DER integer padding (prepend `0x00` if `buf[0] >= 0x80`). This is the standard fix for DER ECDSA encoding. |

---

### `tests/services/kms-admin-rotation.test.ts`

**Overall**: Integration test using real app infrastructure (`buildApp()`, real DB via
`prisma`) is the correct approach per ConnectSW's no-mocks-in-integration-tests policy.
Auth flow is exercised end-to-end. Coverage of happy path, 401, 403, 503, 400 cases is
comprehensive.

| # | Issue | Severity | Location | Suggested Fix |
|---|-------|----------|----------|---------------|
| 16 | All test cases use `[US-KMS-03][AC-1]` as the story ID tag. The acceptance criteria numbering is flat — every test references AC-1. Looking at the cases: auth (401/403), success (200), health failure (503), and validation (400) are distinct acceptance criteria and would benefit from distinct AC IDs (AC-1, AC-2, AC-3, etc.) for traceability. | **Minor** | Lines 110–209 | Assign distinct AC IDs: `[US-KMS-03][AC-1]` for auth, `[US-KMS-03][AC-2]` for success flow, `[US-KMS-03][AC-3]` for health-check failure, `[US-KMS-03][AC-4]` for validation. |
| 17 | The test for the 503 case (line 165) verifies `res.statusCode` is 503 and `body.error` is defined. It does not assert that `body.error === 'new-key-unhealthy'` specifically, nor that the `message` field contains the health check message. The assertions are present but loose. | **Minor** | Lines 165–183 | Add: `expect(body.error).toBe('new-key-unhealthy')` and `expect(body.message).toBe('KMS key not accessible')`. |
| 18 | The test at line 165 does not verify that the bad-key state is rolled back after a 503 (which ties back to issue #11 — the rollback doesn't happen in the implementation). Once the rollback is implemented, a test should verify that a subsequent request with the *original* key still succeeds. | **Minor** | After line 183 | Add a follow-up test: after a failed rotation, assert that the KMS service is still operational (e.g., health check returns healthy). |
| 19 | `testUA` includes `Date.now()` (line 49) to make it unique per test run. This is a reasonable pattern to prevent test pollution across runs, but it makes logs noisier than necessary in CI. A static but unique test agent string (e.g. using the test file name) would be more readable in log output. | **Note** | Line 49 | Low priority; acceptable as-is. |

---

### `tests/services/kms-signer.service.test.ts`

**Overall**: Solid unit test coverage of the factory and both providers. Production-guard
tests are well-constructed (calling the function twice and catching separately to assert
on error properties is a good pattern). Env var cleanup in `beforeEach`/`afterEach` is
correct and prevents test pollution.

| # | Issue | Severity | Location | Suggested Fix |
|---|-------|----------|----------|---------------|
| 20 | The production guard tests (lines 109–134) call `createSignerProvider()` twice: once in `expect(() => ...).toThrow()` and again inside a try/catch to assert error properties. This is a common pattern but means the factory function is called twice per test, which has side effects (constructor logs, KMS mock calls). Prefer a single call pattern: assign the thrown error to a variable using a try/catch, then assert on both the throw and the error properties in one block. | **Minor** | Lines 109–134 | Use a single try/catch and assert `expect(caught).toBeInstanceOf(AppError)` plus property assertions. |
| 21 | `jest.mock('ethers', ...)` on lines 53–64 mocks the entire `ethers` module. The mock returns a minimal `mockWallet` but does not include `Transaction`, `keccak256`, or other ethers utilities. This means if `EnvVarSignerProvider` or `KMSWalletAdapter` ever use other ethers APIs, these tests would silently pass without testing the real codepath. | **Note** | Lines 53–64 | Scope the mock more tightly (only mock `ethers.Wallet`) or use `jest.spyOn` on the constructor. Acceptable as-is for current scope but worth noting for future test maintenance. |
| 22 | Test `'should log initialization without exposing any key material'` (line 164) asserts that log calls do not contain `'MERCHANT_WALLET_PRIVATE_KEY'` (the env var *name*, as a string), `'privateKey'`, or `'private_key'`. It does not check that the actual *value* of `KMS_KEY_ID` (`'test-key-id'`) is not logged in full. Given that the audit log tests in `kms-audit-log.test.ts` verify key truncation, this test should be consistent and also verify the key value is not logged verbatim. | **Minor** | Lines 172–184 | Add: `expect(logStr).not.toContain('test-key-id')` (the full key value set on line 166). |

---

## Checklist Results

| Check | Result | Notes |
|-------|--------|-------|
| TypeScript quality — no `any`, strict types | PARTIAL | `as any` on KMSClient config (line 86, kms.service.ts); `mockKMSClient: any` in test (line 33, audit test). Both are low-risk but noted. |
| Error handling — consistent AppError usage | PARTIAL | Plain `Error` used in `EnvVarSignerProvider` (line 104) and in `getPublicKey()` inner throws. See issues #1, #7. |
| Test quality — meaningful assertions, story IDs | PASS | Story IDs present throughout. Assertions are specific. DER builder helpers improve readability. Missing error-path tests (issue #14). |
| Architecture compliance — route/service patterns | PASS | Route error handler order, auth hooks, Zod schemas, and response shapes all match existing routes. |
| No dead code | PARTIAL | `isKeyHealthy()` appears unreferenced. See issue #6. |
| Logging hygiene — no PII or sensitive data | PASS | Key IDs are truncated. Private keys are never logged. Signature bytes (r, s, v) are not logged. Logger has automatic redaction for known sensitive field names. |
| Code clarity — comments, self-descriptive names | PASS | Inline ADR in kms.service.ts is exemplary. `connect()` no-op on KMSWalletAdapter needs a comment (issue #2). |
| Dependency direction — route → service | PASS | No circular dependencies. Routes import services; services do not import routes. |

---

## Critical Issues (Must Fix Before Merge)

None. There are no critical defects.

## Major Issues (Should Fix Before Merge)

1. **Issue #4** — Missing error-path audit log in `signTransaction()` and `sign()`. Security audit trails must capture failures, not just successes.
2. **Issue #11** — Key rotation does not roll back on health-check failure. After a 503 response the singleton is left pointing at the bad new key. This is a correctness bug in a production-critical code path.
3. **Issue #1** — `EnvVarSignerProvider` throws plain `Error` instead of `AppError` when key is missing. Breaks the error serialisation contract.
4. **Issue #14** — No tests for error-path audit logging. These tests are needed to prevent regression on the fix for issue #4.

## Minor Issues (Recommended)

Issues #2, #3, #5, #6, #7, #8, #9, #10, #13, #15, #16, #17, #18, #20, #22.

## Notes Only (Optional)

Issues #12, #19, #21.
