# Living Documentation Protocol

**Version**: 1.0.0
**Created**: 2026-03-27
**Inspired by**: gstack auto-generated SKILL.md files from source code at build time
**Applies to**: Technical Writer, DevOps Engineer, all agents (post-ship)

---

## Purpose

Ensure documentation never drifts from implementation. Documentation is generated from source, validated in CI, and auto-updated after every release. If the code changes, the docs change.

## Problem

Documentation drifts from code because:
1. Developers update code but forget to update docs
2. API changes don't propagate to API.md
3. New routes/endpoints are added without documenting them
4. Configuration options change without updating README
5. Dependency versions drift from what's documented

## Solution: Documentation as Derived Artifacts

Documentation is **generated from source** or **validated against source** — never written independently.

## Auto-Generated Documentation

### 1. API Documentation (from route definitions)

Scan Fastify route files and generate API.md automatically:

```bash
# Extract routes from Fastify app
# Input: apps/api/src/routes/**/*.ts
# Output: docs/API.md

# For each route file, extract:
# - HTTP method + path
# - Request schema (Zod/JSON Schema)
# - Response schema
# - Auth requirements
# - Rate limiting config
```

**Template:**
```markdown
## [METHOD] [PATH]

**Auth**: [Required/Optional/None]
**Rate Limit**: [X requests per Y seconds]

### Request
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|

### Response
| Field | Type | Description |
|-------|------|-------------|

### Example
```json
// Request
// Response
```
```

### 2. Database Schema Documentation (from Prisma)

```bash
# Input: apps/api/prisma/schema.prisma
# Output: docs/data-model.md

# For each model, extract:
# - Model name and description (from /// comments)
# - Fields with types and constraints
# - Relations
# - Indexes
# - Enums
```

### 3. Environment Variables Documentation (from .env.example)

```bash
# Input: apps/api/.env.example, apps/web/.env.example
# Output: docs/configuration.md

# For each variable:
# - Name
# - Description (from comments above the variable)
# - Default value
# - Required/Optional
# - Sensitivity (secret/public)
```

### 4. Component Documentation (from source)

```bash
# Input: apps/web/src/components/**/*.tsx
# Output: docs/components.md

# For each component, extract:
# - Component name
# - Props interface (from TypeScript types)
# - Default props
# - Usage examples (from JSDoc @example tags)
```

### 5. CLI Command Documentation (from scripts)

```bash
# Input: package.json scripts, .claude/scripts/
# Output: docs/commands.md

# For each script:
# - Command name
# - Description (from script name or comments)
# - Arguments/flags
# - Example usage
```

## Validation in CI

Add a CI job that detects documentation drift:

```yaml
# .github/workflows/docs-validation.yml
docs-check:
  name: Documentation Freshness
  runs-on: ubuntu-latest
  steps:
    - name: Regenerate docs
      run: npm run docs:generate

    - name: Check for drift
      run: |
        if git diff --name-only | grep -q "docs/"; then
          echo "❌ Documentation is stale. Run 'npm run docs:generate' and commit."
          git diff docs/
          exit 1
        fi
        echo "✅ Documentation is up to date."
```

## Post-Release Documentation Update

After every `/ship` or Production Gate PASS, the Technical Writer agent:

1. **Regenerates** all auto-generated docs
2. **Validates** manually-written docs against current state:
   - README.md — Are setup instructions still accurate?
   - PRD.md — Do listed features match implementation?
   - ADRs — Are referenced file paths still valid?
3. **Updates** stale sections with current information
4. **Commits** documentation changes with traceability

```markdown
## Post-Release Doc Checklist

- [ ] API.md regenerated from route definitions
- [ ] data-model.md regenerated from Prisma schema
- [ ] configuration.md regenerated from .env.example
- [ ] README.md setup instructions verified (clone, install, run)
- [ ] All internal file path references are valid
- [ ] All referenced commands exist and work
- [ ] Version numbers updated (package.json matches docs)
- [ ] Changelog updated with release notes
- [ ] Architecture diagrams reflect current state
```

## Staleness Detection

Track documentation age relative to source changes:

```bash
# For each doc file, find the last source change that should have updated it
DOC_FILE="docs/API.md"
SOURCE_DIR="apps/api/src/routes/"

DOC_UPDATED=$(git log -1 --format="%ct" -- "$DOC_FILE")
SOURCE_UPDATED=$(git log -1 --format="%ct" -- "$SOURCE_DIR")

if [ "$SOURCE_UPDATED" -gt "$DOC_UPDATED" ]; then
  echo "⚠️ $DOC_FILE is stale (source updated $(date -d @$SOURCE_UPDATED), doc updated $(date -d @$DOC_UPDATED))"
fi
```

**Staleness Rules:**
- Source changed < 1 day ago, doc not updated = **WARNING** (flag in retro)
- Source changed > 3 days ago, doc not updated = **ERROR** (block next release)
- Source changed > 7 days ago, doc not updated = **CRITICAL** (immediate fix)

## Documentation Map

Each product maintains a `docs/DOC-MAP.md` linking docs to source:

```markdown
# Documentation Map

| Document | Source | Auto-Generated | Last Validated |
|----------|--------|----------------|----------------|
| API.md | apps/api/src/routes/ | Yes | 2026-03-27 |
| data-model.md | apps/api/prisma/schema.prisma | Yes | 2026-03-27 |
| configuration.md | .env.example | Yes | 2026-03-27 |
| PRD.md | .specify/ specs | No (manual) | 2026-03-27 |
| ADRs/*.md | N/A | No (manual) | 2026-03-27 |
| README.md | Multiple | Partial | 2026-03-27 |
```

## Enforcement

| Gate | Requirement |
|------|------------|
| CI | Auto-generated docs must be fresh (no drift) |
| Production Gate | All docs validated post-release |
| Retrospective | Staleness flagged as action item |

## Cross-References
- Constitution Article IX: Diagram-First Documentation
- Technical Writer agent: `.claude/agents/technical-writer.md`
- Retrospective Protocol: `.claude/protocols/retrospective.md`
- CI Enforcement: Constitution Article XIII
