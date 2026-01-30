# SEC-032: npm audit must fail CI on high/critical vulnerabilities

## Problem
The CI workflow at `products/stablecoin-gateway/.github/workflows/ci.yml`
had `continue-on-error: true` on both npm audit steps (API and Web),
meaning vulnerable dependencies were reported but never blocked deployment.

## Fix
- Removed `continue-on-error: true` from both audit steps
- Kept `--audit-level=high` (already present) to only block on
  HIGH or CRITICAL vulnerabilities, avoiding noise from low/moderate
- Added policy comment: `# Block builds with HIGH or CRITICAL vulnerabilities`

## Test
- `apps/api/tests/ci/audit-config.test.ts` parses the YAML and verifies:
  1. CI workflow file exists
  2. At least one npm audit step present
  3. No audit step has `continue-on-error` set
  4. All audit steps use `--audit-level=high`
