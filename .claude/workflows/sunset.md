# Workflow: Product Sunset

This workflow guides the Orchestrator through safely retiring a ConnectSW product.

## Trigger

CEO says something like:
- "Archive [product]"
- "Shut down [product]"
- "We're discontinuing [product]"
- "Remove [product] from active development"

## Prerequisites

- CEO has explicitly confirmed the product to sunset
- CEO has confirmed whether data should be preserved or deleted
- No open PRs for the product (merge or close them first)

## Workflow Steps

### Phase 1: Audit & Confirm

```
Step 1.1: Inventory
├── List all open PRs for the product (gh pr list --search "path:products/[product]")
├── List all open GitHub Issues tagged with the product
├── Identify any dependencies from OTHER products on this product's code
├── Check PORT-REGISTRY.md for reserved ports
└── Report inventory to CEO for confirmation before proceeding

Step 1.2: CEO Confirmation
├── Present inventory summary
├── Confirm: "Proceeding will archive [product], release ports [X], close [N] issues, and merge/close [M] PRs"
└── Wait for explicit CEO approval
```

**CHECKPOINT — CEO must confirm before Phase 2.**

### Phase 2: Close Open Work

```
Step 2.1: Close GitHub Issues
├── For each open issue tagged with the product:
│   ├── Add comment: "Closing — [product] has been sunset as of [date]"
│   └── Close the issue

Step 2.2: Handle Open PRs
├── For each open PR targeting the product:
│   ├── If mergeable and approved: merge it (so work is preserved in history)
│   └── If not ready: close with comment "Closing — [product] has been sunset"

Step 2.3: Tag the last commit
└── git tag sunset/[product]/[date] HEAD
    └── Push the tag: git push origin sunset/[product]/[date]
```

### Phase 3: Archive the Product

```
Step 3.1: Create archive branch
├── git checkout -b archive/[product]
└── This branch preserves the full history of the product

Step 3.2: Move product directory
├── git mv products/[product] products/archived/[product]
├── Add README banner to products/archived/[product]/README.md:
│   "## ARCHIVED\nThis product was sunset on [date]. Code preserved for reference."
└── Commit: "chore(archive): sunset [product] [YYYY-MM-DD]"

Step 3.3: Remove CI workflow
├── git rm .github/workflows/[product]-ci.yml (if exists)
└── Commit: "ci: remove [product] CI — product archived"
```

### Phase 4: Update Registries

```
Step 4.1: Update PORT-REGISTRY.md
├── Change product status from "Active" → "Released"
├── Add note: "Released on [date] — product archived"
└── Mark the ports as available for new products

Step 4.2: Update PRODUCT-REGISTRY.md
├── Change tier to "Archived"
├── Update notes with sunset date and reason
└── Add link to archive branch

Step 4.3: Update COMPONENT-REGISTRY.md
├── Review all components sourced from this product
├── If component is still valuable: update source path to archived/ location
└── If component was already extracted to packages/: note that packages/ version is canonical

Step 4.4: Check orchestrator state
└── Remove any pending tasks for this product from .claude/orchestrator/state/
```

### Phase 5: Communicate

```
Step 5.1: Update company docs
└── Update README.md product table — remove or mark as archived

Step 5.2: Create sunset PR
├── PR title: "chore: sunset [product] — archive and registry updates"
├── PR body: Summary of what was done, ports released, reason for sunset
└── Merge after CEO approval
```

**CHECKPOINT — CEO reviews and merges sunset PR.**

### Phase 6: Post-Sunset

```
Step 6.1: Delete stale remote branches (optional)
└── Check for any feature/* or fix/* branches for this product
    └── gh api repos/.../git/refs --jq '.[] | .ref' | grep "[product]"
    └── Delete stale branches with CEO approval

Step 6.2: Memory cleanup (optional)
└── Remove product-specific entries from .claude/memory/company-knowledge.json
    └── Keep entries that are pattern-level (reusable); remove product-specific ones
```

## Archive vs Delete

| Situation | Action |
|-----------|--------|
| Code may be referenced or revived | Archive (this workflow) |
| Confirmed: code has zero future value | Full deletion — delete `products/[product]/` entirely |
| Regulatory/compliance data retention required | Archive + flag for data team |

## Notes

- **Ports are released immediately** after archiving — they can be reassigned to new products.
- **Audit trail is preserved** — `audit-trail.jsonl` entries are never deleted.
- **Agent memory experiences** referencing the product are kept — they are historical records.
- **Git history is permanent** — even if the directory is deleted, the full history remains in git.
