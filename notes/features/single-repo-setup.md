# Single-Repo Setup Plan

## Status: IMPLEMENTED (2026-03-08)

### What was done
1. Created `.claude/scripts/resolve-product.sh` — shared helper that all scripts source to resolve `PRODUCT_DIR`
2. Updated 17 scripts to use the helper instead of hardcoding `products/$PRODUCT`
3. Updated `pre-commit.sh` with dual-mode product detection
4. Updated `generate-state.sh` to iterate single product in single-repo mode
5. Created `.claude/scripts/setup-single-repo.sh` — bootstrap script for new single-repo setups
6. Updated `.claude/CLAUDE.md` to document both directory layouts

### How it works
- `resolve-product.sh` checks: if `products/$PRODUCT` exists → monorepo, if `apps/` exists at root → single-repo
- All scripts source it after setting `REPO_ROOT` and `PRODUCT`, then use `$PRODUCT_DIR`
- Existing monorepo behavior is 100% preserved — the detection is backward-compatible

## Context
A client company wants to use the ConnectSW agent system but:
- They have **separate repos per product** (not a monorepo)
- Each repo has **one product only** — no `products/` folder
- They want a **lighter Command Center** (documentation only)
- **Shared components** need to live at org level, not repo level

---

## Architecture: Two-Tier System

```
Tier 1: Organization-Level (one repo)
  connectsw-platform/                    # Or "{company}-platform"
  ├── .claude/                           # Full agent system (canonical source)
  ├── .specify/                          # Spec-kit constitution + templates
  ├── packages/                          # Shared npm packages (@company/*)
  │   ├── auth/
  │   ├── ui/
  │   ├── eslint-config/
  │   └── ...
  ├── docs/                              # Company-wide documentation
  ├── command-center/                    # Lightweight doc dashboard (no products/ wrapper)
  │   └── apps/web/                      # Static site or Vite app
  └── setup/
      └── setup-single-repo.sh           # Bootstrap script for product repos

Tier 2: Product-Level (many repos, one per product)
  {product-name}/                        # e.g. "billing-api", "customer-portal"
  ├── .claude/                           # Synced subset of agent system
  │   ├── agents/briefs/                 # Compact agent briefs only (not full defs)
  │   ├── protocols/                     # All protocols
  │   ├── scripts/                       # Quality gate scripts
  │   ├── ci/                            # Known issues registry
  │   ├── quality-gates/                 # Gate definitions
  │   ├── commands/                      # Slash commands
  │   ├── orchestrator/                  # Orchestrator (single-product mode)
  │   └── CLAUDE.md                      # Product-specific config
  ├── .specify/                          # Spec-kit (product specs live here)
  ├── .githooks/                         # Git safety hooks
  ├── .github/workflows/                 # Product CI only
  ├── apps/
  │   ├── api/                           # Backend (at repo root, no products/ wrapper)
  │   └── web/                           # Frontend
  ├── e2e/                               # Playwright tests
  ├── docs/
  │   ├── PRD.md
  │   ├── specs/
  │   ├── plan.md
  │   └── tasks.md
  └── package.json                       # Product root (references @company/* packages)
```

---

## What Changes vs Current Setup

### 1. Directory Structure (no `products/` wrapper)

| Current (Monorepo) | New (Single-Repo) | Notes |
|--------------------|--------------------|-------|
| `products/{name}/apps/api/` | `apps/api/` | Code lives at repo root |
| `products/{name}/apps/web/` | `apps/web/` | No nesting |
| `products/{name}/docs/` | `docs/` | Direct |
| `products/{name}/e2e/` | `e2e/` | Direct |
| `products/{name}/package.json` | `package.json` | Repo root IS the product |

### 2. Scripts & Protocols (path changes)

All scripts that reference `products/{PRODUCT}/` need a mode switch:
- **Monorepo mode**: `products/{PRODUCT}/apps/api/` (current)
- **Single-repo mode**: `apps/api/` (new)

Implementation: Add a `REPO_MODE` detection at the top of each script:
```bash
if [ -d "products" ]; then
  PRODUCT_ROOT="products/${PRODUCT}"
else
  PRODUCT_ROOT="."
fi
```

### 3. Orchestrator Changes

The orchestrator currently assumes `products/{PRODUCT}/`. In single-repo mode:
- `{PRODUCT}` is implicit (the repo itself)
- No product discovery loop needed
- State.yml tracks one product only
- Task graph lives at `.claude/task-graph.yml` (not `products/{PRODUCT}/.claude/`)

### 4. Shared Packages → npm Registry or Git Submodules

| Option | Pros | Cons | Recommended When |
|--------|------|------|-----------------|
| **npm private registry** | Clean versioning, `npm install @company/auth` | Needs registry (GitHub Packages, Verdaccio) | 5+ products, mature packages |
| **Git submodules** | No registry needed, direct source | Submodule complexity, version pinning manual | 2-4 products, early stage |
| **Copy + adapt** | Simplest, no dependencies | No upstream sync, drift | 1-2 products |

**Recommendation**: Start with GitHub Packages (free for private repos in GitHub Teams/Enterprise). Each shared package gets `npm publish` in its CI. Product repos install via `npm install @company/auth@^1.0.0`.

### 5. Command Center → Lightweight Doc Hub

Current Command Center is a full Fastify + React app. For docs-only:

**Option A: Static documentation site**
- Astro or VitePress site that aggregates docs from all product repos
- Pulls PRDs, specs, architecture docs via GitHub API
- Renders Mermaid diagrams natively
- Deploys to GitHub Pages or Vercel
- No backend needed

**Option B: GitHub Wiki + automation**
- Each product repo has a wiki
- A GitHub Action syncs key docs to a central wiki
- Zero infrastructure

**Option C: Minimal dashboard (current CC stripped down)**
- Keep the React frontend
- Remove the Fastify API
- Replace with static JSON data generated by a script
- Script runs in CI, aggregates state from all repos via GitHub API

**Recommendation**: Option A (Astro/VitePress) — it's the right tool for the job, renders Mermaid natively, and GitHub Pages hosting is free.

### 6. CI Workflows

Each product repo gets:
- `{product}-ci.yml` — lint, test, build, E2E
- `security-sast.yml` — Semgrep, CodeQL, Trivy (copy from current)
- `ci-preflight` integration (pre-push hook)

The org-level repo gets:
- `publish-packages.yml` — build + publish shared packages to npm
- `sync-docs.yml` — aggregate docs for Command Center
- `update-framework.yml` — version + distribute `.claude/` updates

### 7. Component Registry

Split into two levels:

**Org-level** (in platform repo): `COMPONENT-REGISTRY.md`
- Shared packages (`@company/auth`, `@company/ui`, etc.)
- Reusable patterns and templates
- Cross-product conventions

**Product-level** (in each product repo): `PRODUCT-COMPONENTS.md`
- Product-specific components
- Links back to org registry for shared ones

---

## Setup Script Design: `setup-single-repo.sh`

```
Usage: setup-single-repo.sh <company-name> <product-name> [--force]

What it does:
1. Copies .claude/ (agent system — briefs only, not full agent defs)
2. Copies .specify/ (spec-kit framework)
3. Copies .githooks/ (git safety)
4. Copies .github/ templates (PR, issue templates)
5. Creates product CI workflow from template
6. Creates .claude/CLAUDE.md with single-product config
7. Creates .claude/orchestrator/state.yml with one product
8. Sets REPO_MODE=single in .claude/config.yml
9. Replaces "ConnectSW" with company name
10. Sets git hooks path
11. Creates docs/ structure (PRD.md template, specs/, plan.md, tasks.md)
12. Creates apps/ structure if not exists
```

Key differences from `setup-connectsw.sh`:
- No `products/` directory
- No Command Center copy
- No shared packages copy (those live in org repo)
- Adds `REPO_MODE: single` config
- Creates product-specific CI workflow
- Lighter footprint (~50% fewer files)

---

## Migration Steps for the Client

### Phase 1: Org-Level Setup (Day 1)

1. Create `{company}-platform` repo
2. Run `setup-connectsw.sh {CompanyName}` in that repo
3. Move shared packages to `packages/`
4. Set up GitHub Packages for `@{company}/*` publishing
5. Set up lightweight Command Center (Astro site)
6. Commit and push

### Phase 2: Product Repo Setup (Day 1-2, per repo)

1. In each existing product repo, run:
   ```bash
   CONNECTSW_SOURCE=path/to/{company}-platform \
     bash setup-single-repo.sh {CompanyName} {product-name}
   ```
2. Move existing code into `apps/api/` and `apps/web/` if not already structured
3. Add `@{company}/*` dependencies to package.json
4. Commit `.claude/`, `.specify/`, `.githooks/`, `.github/`
5. Test: `/orchestrator status`

### Phase 3: Documentation Hub (Day 2-3)

1. Build Astro/VitePress site in platform repo
2. Add GitHub Action to pull docs from product repos
3. Deploy to GitHub Pages
4. Configure auto-refresh on product repo pushes (webhook)

### Phase 4: Framework Updates (Ongoing)

When the platform repo updates agents/protocols:
1. Run `setup-single-repo.sh --update` in each product repo
2. Or automate via GitHub Action that creates PRs in product repos

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.claude/scripts/setup-single-repo.sh` | Create | Bootstrap script for product repos |
| `.claude/config.yml` | Create | `REPO_MODE: single` or `REPO_MODE: monorepo` |
| `.claude/scripts/ci-preflight.sh` | Modify | Add REPO_MODE detection |
| `.claude/orchestrator/orchestrator-enhanced.md` | Modify | Add single-repo path resolution |
| All quality gate scripts | Modify | Add REPO_MODE detection |
| `.claude/templates/product-ci.yml` | Create | CI workflow template for product repos |
| `command-center-lite/` | Create | Astro/VitePress doc aggregator |

---

## Open Questions for the Client

1. **Package manager**: Are they using pnpm, npm, or yarn?
2. **Existing CI**: Do they have existing GitHub Actions they want to keep?
3. **GitHub org**: Do they have a GitHub org (needed for GitHub Packages)?
4. **Tech stack**: Is it the same as ConnectSW (Fastify + Next.js + Prisma) or different?
5. **How many products**: How many repos will use this system?
6. **Auth/shared services**: Do they have shared auth or other cross-product services?
7. **Documentation needs**: What do they want in the doc hub — just PRDs, or also API docs, architecture, status?
