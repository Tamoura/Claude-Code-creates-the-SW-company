# Update Command Center Data

Refresh all cross-product data in the Command Center by scanning the live codebase and updating the JSON data files. Keeps CEO-curated judgment fields (score, pricing model, strategic phase) and only rewrites factual/computable fields (completion %, TTR estimates, blockers derived from missing components, lastUpdated).

## Usage

```
/update-cc-data
```

## What Gets Updated

| Data File | Fields Auto-Refreshed | Fields Left Alone |
|-----------|----------------------|-------------------|
| `.claude/monetization.json` | `completion`, `ttrWeeksMin`, `ttrWeeksMax`, `blockers` (structural gaps only), `lastUpdated` | `score`, `phase`, `pricingModel`, `pricingDetail`, `strengths` |

## Execution Steps

### Step 1 — Collect Product Metrics

Run this bash block to gather factual codebase data for every product:

```bash
echo "=== COMMAND CENTER DATA REFRESH ==="
echo "Scanning products at: $(date)"
echo ""

REPO_ROOT="$(git rev-parse --show-toplevel)"
MONO_ROOT="$REPO_ROOT"

for product_dir in "$MONO_ROOT/products"/*/; do
  [ -d "$product_dir" ] || continue
  product=$(basename "$product_dir")
  [ "$product" = "command-center" ] && continue  # skip internal tool

  # ── Structural presence ──────────────────────────────────────────
  has_api=0; has_web=0; has_docker=0; has_ci=0; has_e2e=0
  [ -d "${product_dir}apps/api" ]             && has_api=1
  [ -d "${product_dir}apps/web" ]             && has_web=1
  [ -f "${product_dir}apps/api/Dockerfile" ] || [ -f "${product_dir}Dockerfile" ] && has_docker=1
  [ -d "${MONO_ROOT}/.github/workflows" ] && ls "${MONO_ROOT}/.github/workflows/"*${product}* 2>/dev/null | grep -q . && has_ci=1
  [ -d "${product_dir}e2e" ] && [ "$(find "${product_dir}e2e" -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | wc -l)" -gt 0 ] && has_e2e=1

  # ── File counts ──────────────────────────────────────────────────
  src_files=$(find "$product_dir" \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" -not -path "*/.next/*" \
    -not -path "*/dist/*" -not -name "*.d.ts" 2>/dev/null | wc -l | tr -d ' ')

  test_files=$(find "$product_dir" \( -name "*.test.ts" -o -name "*.test.tsx" \
    -o -name "*.spec.ts" -o -name "*.spec.tsx" \) \
    -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')

  # ── Git activity ─────────────────────────────────────────────────
  commits_7d=$(git -C "$REPO_ROOT" log --oneline --since="7 days ago" -- "$product_dir" 2>/dev/null | wc -l | tr -d ' ')
  commits_30d=$(git -C "$REPO_ROOT" log --oneline --since="30 days ago" -- "$product_dir" 2>/dev/null | wc -l | tr -d ' ')
  last_commit=$(git -C "$REPO_ROOT" log -1 --format="%ar" -- "$product_dir" 2>/dev/null || echo "never")

  # ── Docs presence ────────────────────────────────────────────────
  has_prd=0; has_readme=0; has_adr=0
  [ -f "${product_dir}docs/PRD.md" ]   && has_prd=1
  [ -f "${product_dir}README.md" ]      && has_readme=1
  [ -d "${product_dir}docs/ADRs" ] && [ "$(ls "${product_dir}docs/ADRs" 2>/dev/null | wc -l)" -gt 0 ] && has_adr=1

  # ── Phase from package.json ───────────────────────────────────────
  pkg_phase=""
  if [ -f "${product_dir}package.json" ]; then
    pkg_phase=$(node -e "try{const p=require('${product_dir}package.json');console.log(p.phase||'')}catch(e){}" 2>/dev/null || echo "")
  fi
  if [ -z "$pkg_phase" ] && [ -f "${product_dir}apps/web/package.json" ]; then
    pkg_phase=$(node -e "try{const p=require('${product_dir}apps/web/package.json');console.log(p.phase||'')}catch(e){}" 2>/dev/null || echo "")
  fi

  echo "PRODUCT:$product"
  echo "  src_files=$src_files"
  echo "  test_files=$test_files"
  echo "  has_api=$has_api has_web=$has_web has_docker=$has_docker has_ci=$has_ci has_e2e=$has_e2e"
  echo "  has_prd=$has_prd has_readme=$has_readme has_adr=$has_adr"
  echo "  commits_7d=$commits_7d commits_30d=$commits_30d last_commit=$last_commit"
  echo "  pkg_phase=$pkg_phase"
  echo ""
done
```

### Step 2 — Read Current monetization.json

```bash
cat "$(git rev-parse --show-toplevel)/.claude/monetization.json"
```

### Step 3 — Compute Updated Values

Using the metrics from Step 1, compute the new `completion` percentage and `ttrWeeksMin/ttrWeeksMax` for each product using this formula:

**Completion % formula (100 points max):**

| Condition | Points |
|-----------|--------|
| Has API (`apps/api/`) | +20 |
| Has Web (`apps/web/`) | +20 |
| Has Docker | +8 |
| Has CI/CD | +8 |
| Has E2E tests | +8 |
| Has PRD.md | +6 |
| Has ADRs | +5 |
| Test density ≥ 30% (test_files / src_files ≥ 0.3) | +10 |
| Test density ≥ 15% | +5 (instead of 10) |
| Active in last 30 days (commits_30d > 0) | +10 |
| Active in last 7 days (commits_7d > 0) | +5 (instead of 10) |

Cap at 95 max (100 = fully launched/production). Round to nearest integer.

**TTR formula (weeks):**
- `completion ≥ 85` → TTR = 2–4 weeks
- `completion ≥ 75` → TTR = 4–8 weeks
- `completion ≥ 65` → TTR = 8–12 weeks
- `completion ≥ 55` → TTR = 10–16 weeks
- `completion ≥ 40` → TTR = 16–24 weeks
- `completion < 40` → TTR = 24–36 weeks
- Non-commercial products → TTR = 0, 0

**Auto-derived blockers (structural gaps only):**
Only add these if the condition is true AND the existing blockers list doesn't already mention it:
- `"API not yet implemented"` — if `has_api=0`
- `"Web frontend not yet implemented"` — if `has_web=0`
- `"No E2E test coverage"` — if `has_e2e=0`
- `"No Docker config"` — if `has_docker=0`
- `"No CI/CD pipeline"` — if `has_ci=0`
- `"No PRD documentation"` — if `has_prd=0`

Remove any of the above auto-derived blockers from the list if the condition is now false (i.e., the gap was filled). Never touch blockers that describe business/strategic issues (regulatory complexity, no beta users, etc.).

### Step 4 — Write Updated monetization.json

Update `.claude/monetization.json` using the Edit tool. Only change:
- `completion` per product
- `ttrWeeksMin` and `ttrWeeksMax` per product
- `blockers` — merge structural gap blockers (add/remove based on Step 3 rules, preserve all other blockers)
- `lastUpdated` — set to today's date (YYYY-MM-DD)

**Never modify:** `score`, `phase`, `pricingModel`, `pricingDetail`, `displayName`, `tagline`, `strengths`, `isCommercial`

### Step 5 — Show Diff Summary

After writing, show a clean summary of what changed:

```
=== COMMAND CENTER DATA REFRESH COMPLETE ===
Updated: .claude/monetization.json

Changes:
  stablecoin-gateway  completion: 83% → 87%  TTR: unchanged
  archforge            completion: 78% → 81%  TTR: unchanged
  connectin            completion: 75% → 76%  TTR: unchanged
  ...

No structural-gap blockers added/removed.
(or list any that were added/removed)

lastUpdated: 2026-02-27
```

If nothing changed, say so clearly: "All values are already up to date."

## Notes

- **Score is never auto-updated.** It reflects strategic CEO judgment, not codebase metrics.
- **Pricing model and strategic phase are never auto-updated.** These require deliberate decisions.
- **Run after major merges or product milestones** to keep the Monetization Radar current.
- The Command Center API serves this file at `/api/v1/monetization` — changes are live immediately on next page load (no server restart needed).
