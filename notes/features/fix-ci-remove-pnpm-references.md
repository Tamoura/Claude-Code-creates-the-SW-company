# Fix CI: Remove pnpm references

## Problem

CI workflows failed with `pnpm: not found` because:
- Root `package.json` used `pnpm --filter` in all scripts
- CI workflows use `npm`, not `pnpm`
- No `pnpm-lock.yaml` existed in the repo
- `pnpm-workspace.yaml` referenced non-existent directories (`apps/*`, `packages/*`)
- The `shared/` directory (declared as npm workspace) didn't exist

## Changes

1. **Root `package.json`**: Removed all broken `pnpm --filter` scripts (dev, build, test, lint, db:*). Kept working root-level scripts (format, docker:*, test:e2e). Removed stale `workspaces`, `packageManager`, and pnpm engine requirement.
2. **`pnpm-workspace.yaml`**: Deleted (stale config, pnpm not used).
3. **CI**: `test.yml` lint job uses `npm run lint --if-present`; with no root lint script, it safely skips.

## Notes

- Each product has its own CI workflow with lint/test steps
- Product-specific commands should be run from product directories (e.g., `cd products/invoiceforge/apps/api && npm run lint`)
