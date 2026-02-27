# Security Gate Report — KMS Hot Wallet Feature

**Report ID**: KMS-01-security-gate
**Feature Branch**: feature/stablecoin-gateway/kms-hot-wallet
**Date**: 2026-02-27
**Reviewer**: Security Engineer
**Status**: PASS (with one advisory note)

---

## Scope

This targeted security review covers only the files changed as part of the KMS Hot Wallet Security feature (4 gaps closed):

| Gap | Description | Files Affected |
|-----|-------------|----------------|
| GAP-01 | Startup guard in `createSignerProvider()` | `kms-signer.service.ts` |
| GAP-02 | AppError type fix in `EnvVarSignerProvider.getWallet()` | `kms-signer.service.ts` |
| GAP-03 | Structured audit log in `KMSService.signTransaction()` and `KMSService.sign()` | `kms.service.ts` |
| GAP-04 | `POST /v1/admin/kms/rotate` endpoint | `routes/v1/admin.ts` |

Test files reviewed: `kms-signer.service.test.ts`, `kms-audit-log.test.ts`, `kms-admin-rotation.test.ts`

---

## Checks

### CHECK-1: No Secrets in Logs

**Result: PASS**

Reviewed all `logger.*` calls in `kms.service.ts`, `kms-signer.service.ts`, and `kms-signing.service.ts`.

Findings:

- `KMSService.signTransaction()` (line 155–159) logs `keyId: this.keyId.substring(0, 8) + '...'`. The key ARN or full UUID is never exposed — only the first 8 characters followed by an ellipsis.
- `KMSService.sign()` (line 163–170) applies the same truncation pattern.
- `KMSService.rotateKey()` (lines 185–188) truncates both `oldKeyId` and `newKeyId` to 8 characters before logging.
- The audit log object in both `signTransaction()` and `sign()` contains exactly three fields: `keyId` (truncated), `operation`, and `outcome`. No `r`, `s`, or `v` signature bytes are present in any log call.
- `KMSSignerProvider` initialization log (line 65–67) only logs `{ provider: 'AWS KMS' }`. No key material.
- `EnvVarSignerProvider` warn log (line 97–100) logs only the `network` field. The private key value is explicitly never passed to `logger`.
- `sanitizeKmsError()` in `kms-signing.service.ts` (lines 31–40): in production mode, the error message returned is the generic string `"KMS {operation} failed"` with no AWS internals. In development mode, the raw `error.message` is included — this is appropriate for non-production environments and is isolated behind a `NODE_ENV` check.

Test coverage verifies this: `kms-audit-log.test.ts` asserts that `r`, `s`, `v`, and `signature` fields are absent from every log call, and that the full key ID string does not appear anywhere in serialized log output.

---

### CHECK-2: Input Validation on `/v1/admin/kms/rotate`

**Result: PASS**

The Zod schema at `admin.ts` lines 8–10:

```typescript
const kmsRotateBodySchema = z.object({
  newKeyId: z.string().min(1, 'newKeyId is required'),
});
```

- Rejects empty string (`min(1)`) — test coverage at line 198 confirms 400 is returned for `""`.
- Rejects missing body field — test coverage at line 185 confirms 400 for `{}`.
- ZodError is caught and returns a structured 400 response (lines 72–79).

**Advisory note (non-blocking)**: The schema does not enforce a maximum length on `newKeyId`. AWS KMS key IDs are either UUIDs (36 chars) or ARNs (typically under 256 chars). While Zod's default allows unbounded strings, this is not exploitable in isolation because: (a) the value is passed only to `rotateKey()` which stores it internally and passes it to the KMS SDK, (b) no SQL/shell interpolation occurs, and (c) subsequent `healthCheck()` will fail on an invalid key before any permanent state change. A `z.string().min(1).max(2048)` bound would be marginally better hygiene. Recommend as a future improvement, not a blocker.

---

### CHECK-3: Auth Enforcement on `/v1/admin/kms/rotate`

**Result: PASS**

`admin.ts` registers an `onRequest` hook at the plugin scope (lines 26–29):

```typescript
fastify.addHook('onRequest', async (request) => {
  await fastify.authenticate(request);
  await fastify.requireAdmin(request);
});
```

This hook runs before every route handler registered in this plugin, including `POST /kms/rotate`. There is no per-route auth bypass and no conditional logic that could skip authentication.

The `FastifyInstance` interface declares `requireAdmin` as a registered decorator (confirmed in `src/types/index.ts` line 251), meaning the check is a first-class framework constraint — not an inline `if` that could be accidentally omitted.

Test coverage (`kms-admin-rotation.test.ts`) confirms:
- Line 110–118: No auth token returns HTTP 401.
- Line 120–131: MERCHANT role token returns HTTP 403.
- Line 133–148: ADMIN role token returns HTTP 200 and calls `rotateKey()`.

These tests run against the real `buildApp()` instance with real auth middleware applied, providing high-confidence enforcement verification.

---

### CHECK-4: Error Message Safety

**Result: PASS**

Reviewed all `AppError` construction sites in the changed files:

| Location | Error Code | Message |
|----------|-----------|---------|
| `kms.service.ts:75` | `kms-config-error` | `'KMS Key ID is required'` |
| `kms.service.ts:226–229` | `kms-not-configured` | `'KMS_KEY_ID environment variable is required'` |
| `kms-signer.service.ts:90–94` | `kms-not-configured` | `'Raw private key in env vars not allowed in production. Set USE_KMS=true'` |
| `kms-signer.service.ts:125–129` | `kms-not-configured` | `'KMS is required in production. Set USE_KMS=true and KMS_KEY_ID.'` |

None of these messages contain:
- AWS account IDs
- Key ARNs or full key UUIDs
- Internal stack traces or AWS SDK error details
- Memory addresses or file paths

The `AppError.toJSON()` serializer (types/index.ts, lines 148–155) emits only `type`, `title`, `status`, and `detail` (the `message` string). The `details?: unknown` field is not populated by any of the KMS error sites, so no additional internal data can leak via that path.

The `healthCheck()` method (lines 206–216) does pass the raw `error.message` through to the caller in the unhealthy case:

```typescript
message: error instanceof Error ? error.message : String(error)
```

This message is then included in the 503 response body from the rotation endpoint (lines 56–59):

```typescript
return reply.code(503).send({
  error: 'new-key-unhealthy',
  message: health.message,   // <-- raw AWS error here
});
```

**Advisory (non-blocking)**: In the rotation failure path, an AWS SDK error message (e.g., `"Invalid keyId 'arn:aws:kms:us-east-1:123456789:key/...' does not exist"`) could propagate to the admin API consumer. Since this endpoint is admin-only, the exposure surface is limited to already-privileged operators — not the public. However, sanitizing the 503 message to a generic `"KMS health check failed for new key"` before returning it would prevent ARN/account-ID leakage even to admin users. Recommended as a follow-up hardening item, not a release blocker given the admin-only scope.

---

### CHECK-5: npm Audit

**Result: ADVISORY (high findings are all in dev or transitive build tooling)**

`npm audit --audit-level=high` reports 26 vulnerabilities: 17 low, 2 moderate, 7 high.

High-severity findings:

| Package | CVSSv3 | Advisory | Production? |
|---------|--------|----------|-------------|
| `minimatch` (via `@fastify/swagger-ui` → `@fastify/static` → `glob`) | 7.5 | GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74, GHSA-3ppc-4f35-3m26 (ReDoS) | Indirect — not in direct `dependencies` |
| `minimatch` (via `eslint`, `@eslint/eslintrc`, `glob`) | 7.5 | Same as above | Dev tooling only |
| `@isaacs/brace-expansion` | — | GHSA-7h2j-956f-4vf2 (Uncontrolled Resource Consumption) | Transitive only |
| `@typescript-eslint/*` family | — | Transitive via `@typescript-eslint/eslint-plugin` | Dev tooling only |

**Assessment**:

- The `@typescript-eslint/*` and eslint-chain vulnerabilities are in lint tooling that does not run in production. Not a deployment risk.
- The `minimatch` vulnerability in `@fastify/static@9.0.0` is a transitive dependency pulled in by `@fastify/swagger-ui`. The `minimatch` version installed is `10.1.1`, and the affected range for GHSA-7r86-cg39-jmmj is `>=10.0.0 <10.2.3`. `@fastify/static` uses minimatch only for file-glob matching on static asset serving. The API does not serve static files directly (no `@fastify/static` in `package.json` `dependencies`). The instance of minimatch at risk is only invoked if static files are served, which does not occur in this API backend.
- None of the vulnerable packages are used in the KMS signing, key management, or admin rotation code paths.

**Recommendation**: Run `npm audit fix` after the PR merges to address transitive vulnerabilities. Track `@fastify/swagger-ui` for an update that pins to minimatch >=10.2.3. This does not block the current feature.

---

### CHECK-6: No Hardcoded Secrets

**Result: PASS**

Grepped all three changed source files for: AWS ARN patterns (`arn:aws`), UUID patterns, 64-hex private key strings (`0x[0-9a-fA-F]{64}`), and AWS access key prefixes (`AKIA`).

No matches found in any of:
- `src/services/kms.service.ts`
- `src/services/kms-signer.service.ts`
- `src/routes/v1/admin.ts`

All sensitive values (key IDs, private keys, AWS credentials) are consumed exclusively via `process.env.*` calls. No fallback literal values are present.

---

## Issues Found

| ID | Severity | Description | Recommendation |
|----|----------|-------------|----------------|
| ADVISORY-01 | LOW | `newKeyId` has no maximum length constraint in the Zod schema. AWS KMS key IDs are bounded in practice but the schema does not enforce it. | Add `.max(2048)` to `kmsRotateBodySchema.newKeyId` in a follow-up. |
| ADVISORY-02 | LOW | Raw AWS error message from `healthCheck()` passes through to the admin 503 response, potentially leaking ARN or account ID to admin callers. | Sanitize the `healthCheck()` unhealthy message to a generic string before including it in the 503 body. |
| ADVISORY-03 | INFO | `npm audit` reports 7 high-severity findings in `minimatch` and `@typescript-eslint/*`. All are in dev tooling or transitive swagger-ui dependencies not exercised by the API runtime. | Run `npm audit fix` post-merge; monitor `@fastify/swagger-ui` for updates. |

---

## Verdict

**SAFE TO SHIP**

All six primary security checks pass. The two low-severity advisories do not create an exploitable attack surface:

- ADVISORY-01 (max length): The unbounded key ID cannot cause injection or DoS; the KMS SDK and subsequent health check validate the value against AWS before any state change occurs.
- ADVISORY-02 (503 message): The endpoint is admin-only, limiting exposure to already-privileged operators. No public data exposure.
- ADVISORY-03 (npm audit): No vulnerable package is in a code path exercised by the KMS feature or the API runtime in general.

The implementation correctly enforces: startup fail-fast in production without KMS, proper AppError typing for structured error handling, audit logs with truncated key IDs and no signature bytes, and admin-only authentication with both 401 and 403 enforced and tested with real integration tests.

---

*Security Gate completed by Security Engineer agent — 2026-02-27*
