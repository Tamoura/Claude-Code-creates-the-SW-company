# Task List: KMS Hot Wallet Security (KMS-01)

**Product**: stablecoin-gateway
**Branch**: `feature/stablecoin-gateway/kms-hot-wallet`
**Status**: Ready for Implementation
**Generated**: 2026-02-27
**Spec**: `docs/specs/KMS-01-kms-hot-wallet-security.md`
**Plan**: `docs/features/KMS-01-plan.md`

---

## Overview

This task list covers all gaps identified in the KMS-01 plan (GAP-01 through GAP-04) and organizes work into dependency-ordered phases for independent delivery. All tasks follow Test-Driven Development (TDD): tests are written first (Red phase), then implementation code (Green phase), with refactoring as needed.

---

## Execution Strategy

- **User Stories**: Three stories (US-KMS-01, US-KMS-02, US-KMS-03) map to phased implementation
- **Phase 1**: Production startup guard + error type fix (US-KMS-01, 2 gaps)
- **Phase 2**: Structured audit logging (US-KMS-02, 1 gap)
- **Phase 3**: Admin key rotation endpoint (US-KMS-03, 1 gap)
- **Parallelization**: No cross-phase dependencies; each phase can be completed independently
- **Testing**: All phases include unit + integration testing

---

## Phase 1: Production Startup Guard (US-KMS-01 / AC-KMS-01-02)

**Gaps**: GAP-01, GAP-02
**Story**: US-KMS-01: Secure Key Storage
**Agent**: Backend Engineer
**Priority**: P1 (blocks production deployment)
**Dependency**: None

### T-KMS-01-01: Write tests for production startup guard

**Description**: Create failing tests in `kms-signer.service.test.ts` that enforce AC-KMS-01-02 behavior. Tests verify:
1. `createSignerProvider()` throws `AppError` with code `kms-not-configured` when `NODE_ENV=production` and `USE_KMS` is absent/falsy
2. `createSignerProvider()` throws `AppError` with code `kms-not-configured` when `NODE_ENV=production` and `USE_KMS=false`
3. `createSignerProvider()` succeeds when `NODE_ENV=production` and `USE_KMS=true`
4. `createSignerProvider()` succeeds when `NODE_ENV=development` and `USE_KMS=false` (with WARN log, tested separately)

**Status**: TDD Red phase — do NOT implement yet
**File**: `apps/api/tests/services/kms-signer.service.test.ts`
**Acceptance Criteria**:
- [ ] Four new test cases added (all failing)
- [ ] Tests use Jest matchers: `expect(fn).toThrow()`, `expect(error.code).toBe('kms-not-configured')`
- [ ] Tests cover both `USE_KMS` undefined and `USE_KMS=false` cases
- [ ] No implementation code changes yet

**Expected Test Failures**:
```
FAIL apps/api/tests/services/kms-signer.service.test.ts
  ✗ createSignerProvider throws kms-not-configured when NODE_ENV=production and USE_KMS absent
  ✗ createSignerProvider throws kms-not-configured when NODE_ENV=production and USE_KMS=false
  ✓ createSignerProvider succeeds when NODE_ENV=production and USE_KMS=true
  ✓ createSignerProvider succeeds when NODE_ENV=development and USE_KMS=false
```

**Story IDs**: [US-KMS-01]

---

### T-KMS-01-02: Implement production startup guard in createSignerProvider()

**Description**: Implement the minimum code changes to pass T-KMS-01-01 tests.

**File**: `apps/api/src/services/kms-signer.service.ts`
**Changes**:
1. At the top of `createSignerProvider()` function, add a guard:
   ```typescript
   if (NODE_ENV === 'production' && USE_KMS !== 'true') {
     throw new AppError(
       500,
       'kms-not-configured',
       'KMS is required in production. Set USE_KMS=true and KMS_KEY_ID.'
     );
   }
   ```

**Acceptance Criteria**:
- [ ] T-KMS-01-01 tests all pass (Red → Green)
- [ ] No existing tests regress
- [ ] `AppError` import already present in file
- [ ] Error code is exactly `'kms-not-configured'` (string match)
- [ ] Error condition checked before any KMS service instantiation

**Status**: TDD Green phase
**Story IDs**: [US-KMS-01]
**Depends On**: T-KMS-01-01

---

### T-KMS-01-03: Write tests for EnvVarSignerProvider error code

**Description**: Create failing tests in `kms-signer.service.test.ts` that enforce AC-KMS-01-02 for the env-var path. Tests verify:
1. `EnvVarSignerProvider.getWallet()` throws an error with `code: 'kms-not-configured'` when called in production
2. Error message includes "Raw private key in env vars not allowed in production"

**Status**: TDD Red phase
**File**: `apps/api/tests/services/kms-signer.service.test.ts`
**Acceptance Criteria**:
- [ ] Two new test cases added (both failing initially)
- [ ] Tests check `error.code === 'kms-not-configured'`
- [ ] Tests verify error message contains the required string
- [ ] No implementation code changes yet

**Expected Test Failures**:
```
FAIL apps/api/tests/services/kms-signer.service.test.ts
  ✓ createSignerProvider throws kms-not-configured when NODE_ENV=production and USE_KMS absent
  ✓ createSignerProvider throws kms-not-configured when NODE_ENV=production and USE_KMS=false
  ✗ EnvVarSignerProvider.getWallet throws kms-not-configured in production
```

**Story IDs**: [US-KMS-01]

---

### T-KMS-01-04: Implement error code fix in EnvVarSignerProvider.getWallet()

**Description**: Update `EnvVarSignerProvider.getWallet()` to throw `AppError` with code `kms-not-configured` instead of a plain `Error`.

**File**: `apps/api/src/services/kms-signer.service.ts`
**Changes**:
1. Locate `EnvVarSignerProvider.getWallet()` method
2. Replace the existing error throw with:
   ```typescript
   throw new AppError(
     500,
     'kms-not-configured',
     'Raw private key in env vars not allowed in production. Set USE_KMS=true.'
   );
   ```

**Acceptance Criteria**:
- [ ] T-KMS-01-03 tests all pass
- [ ] Existing error log message for development still emits "WARN: NOT SAFE FOR PRODUCTION"
- [ ] No existing tests regress

**Status**: TDD Green phase
**Story IDs**: [US-KMS-01]
**Depends On**: T-KMS-01-03

---

### T-KMS-01-05: Phase 1 Integration Test — Production Startup Guard

**Description**: Add integration test to verify the full startup flow in production without KMS fails with expected error code.

**File**: `apps/api/tests/integration/kms-startup-guard.test.ts`
**Test Cases**:
1. Start application with `NODE_ENV=production`, `USE_KMS` absent → expect startup error with code `kms-not-configured`
2. Start application with `NODE_ENV=production`, `USE_KMS=false` → expect startup error with code `kms-not-configured`
3. Start application with `NODE_ENV=production`, `USE_KMS=true`, valid `KMS_KEY_ID` → expect startup success

**Acceptance Criteria**:
- [ ] All three cases tested
- [ ] Test uses environment variable injection or mock process.env
- [ ] Startup health check is invoked (confirms production guard is enforced at init time)
- [ ] No existing tests regress

**Status**: TDD + Integration
**Story IDs**: [US-KMS-01]
**Depends On**: T-KMS-01-02, T-KMS-01-04

---

## Phase 2: Structured Signing Audit Log (US-KMS-02 / AC-KMS-02-03)

**Gap**: GAP-03
**Story**: US-KMS-02: Full Signing Audit Trail
**Agent**: Backend Engineer
**Priority**: P1 (compliance requirement)
**Dependency**: Phase 1 (none strictly required, but good practice)

### T-KMS-02-01: Write tests for structured audit logging

**Description**: Create failing tests in a new file `kms-audit-log.test.ts` that enforce AC-KMS-02-03 behavior. Tests verify:
1. After `KMSService.signTransaction()` succeeds, `logger.info` is called with object containing:
   - `keyId`: truncated to first 8 chars + "..." (e.g., "arn:aws:k..." or "abc12345...")
   - `operation`: `'transaction-signing'`
   - `network`: the network value passed to `signTransaction()` (e.g., "ethereum" or "polygon")
   - `outcome`: `'success'`
   - No signature bytes (`r`, `s`, `v`)
2. After `KMSService.sign()` succeeds, `logger.info` is called with:
   - `keyId`: truncated
   - `operation`: `'message-signing'`
   - `outcome`: `'success'`
   - Network field omitted or set to `'message'`
3. On failure, `logger.error` is called with:
   - `outcome`: the error code string (e.g., `'kms-signing-error'`)
   - No raw error trace in the top-level log object
4. The logged `keyId` value never includes more than first 8 characters of the key ID string

**Status**: TDD Red phase
**File**: `apps/api/tests/services/kms-audit-log.test.ts`
**Acceptance Criteria**:
- [ ] 6-8 new test cases added (all failing initially)
- [ ] Tests mock `logger.info` and `logger.error` and inspect call arguments
- [ ] Tests verify log object structure matches schema
- [ ] Tests verify no signature bytes present in log
- [ ] No implementation code changes yet

**Expected Test Failures**:
```
FAIL apps/api/tests/services/kms-audit-log.test.ts
  ✗ KMSService.signTransaction success emits structured log with truncated keyId
  ✗ KMSService.signTransaction logs operation=transaction-signing and network
  ✗ KMSService.sign success emits structured log
  ✗ KMSService logs keyId truncated to first 8 chars
  ✗ KMSService.signTransaction failure logs outcome with error code
  ✗ Signature bytes not present in log output
```

**Story IDs**: [US-KMS-02]

---

### T-KMS-02-02: Implement structured audit log in KMSService.signTransaction()

**Description**: Add structured `logger.info` call after successful signing and structured `logger.error` call on failure.

**File**: `apps/api/src/services/kms.service.ts`
**Changes**:
1. At the end of `signTransaction()` method (after signature is returned), add:
   ```typescript
   logger.info({
     keyId: this.keyId.substring(0, 8) + '...',
     operation: 'transaction-signing',
     network: network || 'unknown',
     outcome: 'success',
   });
   return result;
   ```
2. In the catch block (if present) or in error handling, log:
   ```typescript
   logger.error({
     keyId: this.keyId.substring(0, 8) + '...',
     operation: 'transaction-signing',
     network: network || 'unknown',
     outcome: error.code || 'unknown-error',
     // Note: do NOT include raw error object
   });
   ```

**Acceptance Criteria**:
- [ ] T-KMS-02-01 tests pass for `signTransaction()` success and failure cases
- [ ] Log entry emitted AFTER transaction is signed (not before)
- [ ] `keyId` value in log is truncated (first 8 chars + "...")
- [ ] No raw signature values (`r`, `s`, `v`) in log object
- [ ] Network parameter is passed through or defaults to `'unknown'`
- [ ] Existing tests do not regress

**Status**: TDD Green phase
**Story IDs**: [US-KMS-02]
**Depends On**: T-KMS-02-01

---

### T-KMS-02-03: Implement structured audit log in KMSService.sign()

**Description**: Add structured `logger.info` call after successful raw signing.

**File**: `apps/api/src/services/kms.service.ts`
**Changes**:
1. At the end of `sign()` method (after signature is returned), add:
   ```typescript
   logger.info({
     keyId: this.keyId.substring(0, 8) + '...',
     operation: 'message-signing',
     outcome: 'success',
   });
   return result;
   ```
2. In error handling (if present), log similar structure with `outcome: error.code`.

**Acceptance Criteria**:
- [ ] T-KMS-02-01 tests pass for `sign()` success and failure cases
- [ ] `operation` value is exactly `'message-signing'`
- [ ] `network` field is omitted (not included in log object)
- [ ] Existing tests do not regress

**Status**: TDD Green phase
**Story IDs**: [US-KMS-02]
**Depends On**: T-KMS-02-01

---

### T-KMS-02-04: Phase 2 Integration Test — Audit Log Completeness

**Description**: Add integration test to verify signing operations emit structured audit logs correctly in a realistic flow.

**File**: `apps/api/tests/integration/kms-audit-trail.test.ts`
**Test Cases**:
1. Execute a refund transaction via `BlockchainTransactionService` → verify audit log contains correct fields
2. Sign a raw message → verify audit log contains `operation: 'message-signing'`
3. Capture multiple sign operations → verify each has unique timestamp and correct keyId truncation
4. Verify logs can be filtered by `outcome: 'success'` or `outcome: 'error-code'`

**Acceptance Criteria**:
- [ ] Integration test runs against mock KMS (or localstack if available)
- [ ] Structured audit logs are captured via mock/spy on logger
- [ ] Log output can be serialized and sent to CloudWatch / audit sink
- [ ] All test cases pass

**Status**: TDD + Integration
**Story IDs**: [US-KMS-02]
**Depends On**: T-KMS-02-02, T-KMS-02-03

---

## Phase 3: Admin Key Rotation Endpoint (US-KMS-03 / AC-KMS-03-04)

**Gap**: GAP-04
**Story**: US-KMS-03: Zero-Downtime Key Rotation
**Agent**: Backend Engineer
**Priority**: P2 (operational feature, not blocking initial launch)
**Dependency**: Phase 1 + Phase 2 (recommended, not required)

### T-KMS-03-01: Write tests for admin rotation endpoint

**Description**: Create failing tests in `kms-admin-rotation.test.ts` that enforce the `POST /v1/admin/kms/rotate` endpoint behavior.

**Test Cases**:
1. `POST /v1/admin/kms/rotate` without auth returns 401 Unauthorized
2. `POST /v1/admin/kms/rotate` with non-admin user returns 403 Forbidden
3. `POST /v1/admin/kms/rotate` with valid admin auth and valid `newKeyId` in body:
   - Calls `KMSService.rotateKey(newKeyId)`
   - Calls `KMSService.healthCheck()` on new key
   - Returns 200 with body: `{ status: 'rotated', keyId: 'abc12345...' }`
4. `POST /v1/admin/kms/rotate` where health check on new key returns unhealthy:
   - Does NOT update keyId
   - Returns 503 with body: `{ error: 'rotation-failed', message: '...' }`
5. `POST /v1/admin/kms/rotate` with missing `newKeyId` in body returns 400 Bad Request with error message
6. Response contains truncated keyId (first 8 chars + "...", never full key ID)

**Status**: TDD Red phase
**File**: `apps/api/tests/routes/v1/admin-kms-rotation.test.ts`
**Acceptance Criteria**:
- [ ] 6 test cases created (all failing initially)
- [ ] Tests mock `KMSService` and verify methods are called with correct arguments
- [ ] Tests verify response status codes and body structure
- [ ] Tests verify authentication/authorization middleware is invoked
- [ ] No route implementation yet

**Expected Test Failures**:
```
FAIL apps/api/tests/routes/v1/admin-kms-rotation.test.ts
  ✗ POST /v1/admin/kms/rotate without auth returns 401
  ✗ POST /v1/admin/kms/rotate with non-admin returns 403
  ✗ POST /v1/admin/kms/rotate with valid admin rotates key
  ✗ POST /v1/admin/kms/rotate with unhealthy new key returns 503
  ✗ POST /v1/admin/kms/rotate with missing newKeyId returns 400
  ✗ Response keyId is truncated
```

**Story IDs**: [US-KMS-03]

---

### T-KMS-03-02: Implement admin rotation endpoint

**Description**: Add route handler for `POST /v1/admin/kms/rotate` in the admin routes file.

**File**: `apps/api/src/routes/v1/admin.ts`
**Changes**:
1. Add new route:
   ```typescript
   router.post<{ Body: { newKeyId: string } }>(
     '/kms/rotate',
     { schema: { body: { type: 'object', properties: { newKeyId: { type: 'string' } }, required: ['newKeyId'] } } },
     async (request, reply) => {
       // Verify admin auth (middleware already applied to admin route group)
       const { newKeyId } = request.body;

       try {
         // Call rotateKey on the KMSService
         await blockchainTransactionService.kmsService.rotateKey(newKeyId);

         // Check health of new key
         const health = await blockchainTransactionService.kmsService.healthCheck();

         if (health.status !== 'healthy') {
           return reply.code(503).send({
             error: 'rotation-failed',
             message: 'New KMS key is not healthy. Rotation aborted.',
           });
         }

         return reply.code(200).send({
           status: 'rotated',
           keyId: newKeyId.substring(0, 8) + '...',
         });
       } catch (error) {
         logger.error({ error, operation: 'key-rotation' });
         return reply.code(500).send({
           error: 'rotation-error',
           message: 'Key rotation failed. Check logs for details.',
         });
       }
     }
   );
   ```

2. Ensure admin auth middleware is applied to the admin route group (if not already).

**Acceptance Criteria**:
- [ ] T-KMS-03-01 tests all pass
- [ ] Route path is exactly `/v1/admin/kms/rotate`
- [ ] Request body schema validates `newKeyId` as required string
- [ ] Admin auth middleware is applied (existing middleware reused)
- [ ] Health check is called AFTER `rotateKey()`
- [ ] If health check fails, rotation is not persisted (or is rolled back)
- [ ] Response includes truncated keyId (first 8 chars)
- [ ] Existing tests do not regress

**Status**: TDD Green phase
**Story IDs**: [US-KMS-03]
**Depends On**: T-KMS-03-01

---

### T-KMS-03-03: Phase 3 Integration Test — End-to-End Key Rotation

**Description**: Add integration test to verify key rotation works without dropping in-flight transactions.

**File**: `apps/api/tests/integration/kms-rotation-flow.test.ts`
**Test Cases**:
1. Start application with `KEY_A` in KMS service
2. Initiate a signing operation (hold it mid-flight via mock delay)
3. While op is in-flight, call admin endpoint to rotate to `KEY_B`
4. Verify in-flight operation completes with `KEY_A` signature
5. Verify new signing operations after rotation use `KEY_B`
6. Verify cache is cleared post-rotation (next `getAddress()` fetches fresh public key)
7. Verify health check on `KEY_B` is successful

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] In-flight operations use old key without interference
- [ ] New operations use new key
- [ ] Cache is actually cleared (verified via cache state inspection or spies)
- [ ] No transactions are dropped

**Status**: TDD + Integration
**Story IDs**: [US-KMS-03]
**Depends On**: T-KMS-03-02

---

## Phase 4: Cross-Cutting & Quality Assurance

**Agent**: Backend Engineer + QA Engineer
**Priority**: P0 (required for any phase merge)
**Dependency**: All phases (T-KMS-01-05, T-KMS-02-04, T-KMS-03-03)

### T-KMS-04-01: Verify all unit tests pass

**Description**: Run full test suite for KMS services and ensure no regressions.

**File**: `apps/api/tests/services/`
**Commands**:
```bash
npm test -- --testPathPattern="kms" --verbose
npm test -- --testPathPattern="admin" --verbose
```

**Acceptance Criteria**:
- [ ] All existing KMS tests still pass
- [ ] All new tests (T-KMS-01-01 through T-KMS-03-03) pass
- [ ] Coverage report shows no regressions
- [ ] No warnings or deprecations

**Status**: Verification
**Story IDs**: [US-KMS-01, US-KMS-02, US-KMS-03]
**Depends On**: All implementation tasks

---

### T-KMS-04-02: Verify integration tests pass

**Description**: Run all KMS-related integration tests and startup flow tests.

**Commands**:
```bash
npm test -- --testPathPattern="integration/kms" --verbose
npm test -- --testPathPattern="integration/admin" --verbose
```

**Acceptance Criteria**:
- [ ] All integration tests pass
- [ ] Startup guard works in real app context
- [ ] Audit logs are correctly emitted
- [ ] Key rotation works end-to-end
- [ ] No flakiness (tests pass consistently on re-run)

**Status**: Verification
**Story IDs**: [US-KMS-01, US-KMS-02, US-KMS-03]
**Depends On**: T-KMS-04-01

---

### T-KMS-04-03: Update SECURITY-DECISIONS.md — CRIT-002 Sign-Off

**Description**: Update the security decisions document to reflect that CRIT-002 is now closed.

**File**: `products/stablecoin-gateway/docs/SECURITY-DECISIONS.md`
**Changes**:
1. Locate CRIT-002 entry (raw key in env var risk)
2. Update status from "ACCEPTED" to "MITIGATED"
3. Add note: "Mitigated via KMS-01 (2026-02-27): Raw key replaced with AWS KMS signing. All signing operations now routed through HSM. CloudTrail audit enabled."
4. Add sign-off: "Signed off by: Backend Engineer, Security Engineer, DevOps"
5. Update compliance section to note AC-KMS-02-03 requirement for CloudTrail

**Acceptance Criteria**:
- [ ] CRIT-002 status changed to "MITIGATED"
- [ ] Mitigation note references KMS-01 spec + plan
- [ ] Document is clear and audit-trail ready

**Status**: Documentation
**Story IDs**: [US-KMS-01, US-KMS-02, US-KMS-03]
**Depends On**: T-KMS-04-02

---

### T-KMS-04-04: Update COMPONENT-REGISTRY.md — KMS Signing Pattern

**Description**: Add KMS signing pattern to the component registry for future reuse if ConnectSW launches additional blockchain products.

**File**: `.claude/COMPONENT-REGISTRY.md`
**Entry**:
```markdown
### Blockchain KMS Signing (AWS)

**Files**:
- `products/stablecoin-gateway/apps/api/src/services/kms.service.ts`
- `products/stablecoin-gateway/apps/api/src/services/kms-signing.service.ts`
- `products/stablecoin-gateway/apps/api/src/services/kms-signer.service.ts`

**Description**: AWS KMS-backed signing for blockchain transactions. Stores raw private key exclusively in AWS HSM (FIPS 140-2 Level 3). Handles DER signature parsing, EIP-2 s normalisation, recovery parameter determination, and structured audit logging.

**Pattern for Reuse**:
1. Copy the three service files to your blockchain product
2. Inject `KMSService` into your transaction signing service
3. Ensure `USE_KMS` env var and `KMS_KEY_ID` are configured in deployment
4. Call `kmsService.signTransaction(tx, network)` for signing

**Dependencies**:
- `@aws-sdk/client-kms` (AWS SDK)
- `ethers` v6 (Ethereum serialisation)
- `asn1.js` (DER parsing)

**Tested**: Yes. See `kms.service.test.ts`, `kms-signing-algorithm.test.ts`, `kms-recovery-validation.test.ts`, `kms-audit-log.test.ts`, `kms-admin-rotation.test.ts`

**Status**: Production (used in stablecoin-gateway)
**Last Updated**: 2026-02-27 (KMS-01)
```

**Acceptance Criteria**:
- [ ] Entry added to registry under "Blockchain KMS Signing" section
- [ ] All required fields present (files, description, dependencies, test refs, status)
- [ ] Format matches existing registry entries

**Status**: Documentation
**Story IDs**: [US-KMS-01, US-KMS-02, US-KMS-03]
**Depends On**: T-KMS-04-03

---

### T-KMS-04-05: Run speckit.analyze — Consistency Gate

**Description**: Run the spec-kit consistency analysis to verify spec/plan/tasks alignment.

**Command**:
```bash
/speckit.analyze
# Validates KMS-01-kms-hot-wallet-security.md, KMS-01-plan.md, KMS-01-tasks.md consistency
```

**Acceptance Criteria**:
- [ ] All gaps in plan map to tasks in this list
- [ ] All acceptance criteria map to test cases
- [ ] All user stories have corresponding tasks
- [ ] No unmapped requirements
- [ ] No conflicting assumptions

**Status**: Quality Gate
**Story IDs**: [US-KMS-01, US-KMS-02, US-KMS-03]
**Depends On**: T-KMS-04-04

---

## Requirement Traceability Table

This table maps every acceptance criterion and spec requirement to tasks and test cases.

| Story | AC | Requirement | Task | Test Case | Status |
|-------|----|----|------|-----------|--------|
| US-KMS-01 | AC-KMS-01-01 | KMS mode uses kms:Sign; no raw key in heap/logs | T-KMS-02-02, T-KMS-02-03 | kms-audit-log.test.ts | ✓ Implemented |
| US-KMS-01 | AC-KMS-01-02 | Production blocks USE_KMS=false with kms-not-configured error | T-KMS-01-01, T-KMS-01-02, T-KMS-01-03, T-KMS-01-04 | kms-signer.service.test.ts | ✓ Gap Fix |
| US-KMS-01 | AC-KMS-01-03 | No private key bytes in error logs | (Existing) | kms-error-sanitization.test.ts | ✓ Implemented |
| US-KMS-01 | AC-KMS-01-04 | Dev env-var fallback with WARN NOT SAFE FOR PRODUCTION | (Existing) | kms-signer.service.test.ts | ✓ Implemented |
| US-KMS-02 | AC-KMS-02-01 | CloudTrail captures every kms:Sign call | (Operational) | (AWS CloudTrail config) | ✓ Infrastructure |
| US-KMS-02 | AC-KMS-02-02 | SigningAlgorithm is always ECDSA_SHA_256 | (Existing) | kms-signing-algorithm.test.ts | ✓ Implemented |
| US-KMS-02 | AC-KMS-02-03 | Application signing log with timestamp, keyId prefix, operation, network, outcome | T-KMS-02-01, T-KMS-02-02, T-KMS-02-03 | kms-audit-log.test.ts | ✓ Gap Fix |
| US-KMS-03 | AC-KMS-03-01 | rotateKey() switches to new key; in-flight ops complete | (Existing) | kms-key-rotation.test.ts | ✓ Implemented |
| US-KMS-03 | AC-KMS-03-02 | No key material exported on rotation | (Existing) | kms-key-rotation.test.ts | ✓ Implemented |
| US-KMS-03 | AC-KMS-03-03 | Cache invalidated on rotation | (Existing) | kms-key-rotation.test.ts | ✓ Implemented |
| US-KMS-03 | AC-KMS-03-04 | healthCheck() returns correct status post-rotation within 5s | (Existing) | kms-key-rotation.test.ts | ✓ Implemented |
| US-KMS-03 | (Gap) | Admin endpoint for rotation: POST /v1/admin/kms/rotate | T-KMS-03-01, T-KMS-03-02 | admin-kms-rotation.test.ts | ✓ Gap Fix |

---

## Gap Mapping

| Gap ID | Description | Task(s) | Status |
|--------|-------------|---------|--------|
| GAP-01 | Startup guard: production should reject at app start, not at first signing attempt | T-KMS-01-01, T-KMS-01-02 | Phase 1 |
| GAP-02 | Error code: production env-var block must throw `kms-not-configured` | T-KMS-01-03, T-KMS-01-04 | Phase 1 |
| GAP-03 | Structured signing audit log: success path must emit structured log | T-KMS-02-01, T-KMS-02-02, T-KMS-02-03 | Phase 2 |
| GAP-04 | Admin rotation endpoint: `POST /v1/admin/kms/rotate` | T-KMS-03-01, T-KMS-03-02 | Phase 3 |

---

## Parallelization Opportunities

**Phase 1 (Startup Guard)**: Sequential (T-KMS-01-02 depends on T-KMS-01-01, etc.)
- Can start in parallel with Phase 2 and Phase 3

**Phase 2 (Audit Logging)**: Sequential (T-KMS-02-02 depends on T-KMS-02-01, etc.)
- Can run in parallel with Phase 1 and Phase 3
- T-KMS-02-02 and T-KMS-02-03 can be implemented together if same file

**Phase 3 (Admin Endpoint)**: Sequential (T-KMS-03-02 depends on T-KMS-03-01)
- Can run in parallel with Phase 1 and Phase 2

**Recommended Execution**:
1. Spawn 3 backend engineer agents (or 1 agent via git worktrees)
2. Agent 1: Phase 1 (T-KMS-01-01 → T-KMS-01-05)
3. Agent 2: Phase 2 (T-KMS-02-01 → T-KMS-02-04)
4. Agent 3: Phase 3 (T-KMS-03-01 → T-KMS-03-03)
5. All agents merge back to `feature/stablecoin-gateway/kms-hot-wallet`
6. Serial Phase 4 (T-KMS-04-01 → T-KMS-04-05)

**Estimated Timeline**:
- Phase 1: 2-3 hours (5 tasks)
- Phase 2: 3-4 hours (4 tasks)
- Phase 3: 2-3 hours (3 tasks)
- Phase 4: 1-2 hours (5 tasks)
- **Total (parallel)**: ~4-5 hours
- **Total (serial)**: ~12-15 hours

---

## MVP Recommendation

**For Minimal Viable Hardening** (covers critical risks):
- ✓ Phase 1 (Startup Guard) — **REQUIRED** — Blocks production deployment without KMS
- ✓ Phase 2 (Audit Logging) — **REQUIRED** — Compliance requirement for SOC2/PCI audits
- ✓ Phase 4 (Verification) — **REQUIRED** — Quality gates

**Optional for First Release**:
- ○ Phase 3 (Admin Endpoint) — **NICE TO HAVE** — Can deploy v1 without admin rotation; rotate via code deployment if needed. Add in following sprint if time permits.

**For Production-Ready (Full Feature)**:
- ✓ All phases including Phase 3 — Required for zero-downtime ops in Month 4+

---

## Next Steps

1. **Review**: CEO/Product Manager reviews task list and approves
2. **Assign**: Orchestrator assigns tasks to Backend Engineer(s)
3. **Execute**: Follow TDD (Red → Green → Refactor) for each task
4. **Gate**: Run Phase 4 quality gates before PR merge
5. **PR**: Create PR `feature/stablecoin-gateway/kms-hot-wallet` → `main` with:
   - All tests passing
   - Task list completion checklist
   - Link to spec + plan
   - Link to SECURITY-DECISIONS.md update

---

## Checklist for Task Completion

Before marking any task done, verify:

- [ ] Tests written FIRST (TDD Red phase)
- [ ] Tests FAIL initially
- [ ] Implementation code added (TDD Green phase)
- [ ] Tests PASS
- [ ] Existing tests still PASS (no regressions)
- [ ] Code follows TypeScript + ESLint standards
- [ ] No console.log(); use logger instead
- [ ] Commit message is clear and references task ID
- [ ] Staged files are specific (no `git add .` or `git add -A`)

---

**Generated by**: Orchestrator `/speckit.tasks` command
**Date**: 2026-02-27
**Branch**: feature/stablecoin-gateway/kms-hot-wallet
**Ready for**: `/speckit.implement` command
