#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════
# setup-connectsw.sh — Bootstrap the ConnectSW agent system into any repo
# Usage: setup-connectsw.sh <company-name> [--force]
#        setup-connectsw.sh --update
# ═══════════════════════════════════════════════════════════════════════

# ─── Phase 0: Parse arguments & validate ─────────────────────────────

MODE="install"
COMPANY_NAME=""

for arg in "$@"; do
  case "$arg" in
    --update) MODE="update" ;;
    --force)  MODE="force" ;;
    -*)
      echo "ERROR: Unknown flag: $arg"
      echo "Usage: setup-connectsw.sh <company-name> [--force]"
      echo "       setup-connectsw.sh --update"
      exit 1
      ;;
    *)  COMPANY_NAME="$arg" ;;
  esac
done

# Mutual exclusion: --update and --force cannot be combined
if [[ "$MODE" == "update" && -n "$COMPANY_NAME" ]]; then
  # Check if --force was also passed (would have set MODE=force, but since
  # --update came after, we check the original args)
  for arg in "$@"; do
    if [[ "$arg" == "--force" ]]; then
      echo "ERROR: --update and --force cannot be used together."
      echo ""
      echo "  --update  Syncs framework files, preserves products & state"
      echo "  --force   Full overwrite (requires company name)"
      echo ""
      echo "These are mutually exclusive. Pick one."
      exit 1
    fi
  done
fi

# Also catch if both flags were passed (--force then --update → MODE=update)
HAS_FORCE=false
HAS_UPDATE=false
for arg in "$@"; do
  [[ "$arg" == "--force" ]] && HAS_FORCE=true
  [[ "$arg" == "--update" ]] && HAS_UPDATE=true
done
if $HAS_FORCE && $HAS_UPDATE; then
  echo "ERROR: --update and --force cannot be used together."
  echo ""
  echo "  --update  Syncs framework files, preserves products & state"
  echo "  --force   Full overwrite (requires company name)"
  echo ""
  echo "These are mutually exclusive. Pick one."
  exit 1
fi

SOURCE="${CONNECTSW_SOURCE:-/Users/tamer/Desktop/Projects/Claude Code creates the SW company}"
TARGET="$(pwd)"

if [[ ! -d "$SOURCE/.claude" ]]; then
  echo "ERROR: Source directory not found: $SOURCE/.claude"
  echo "Set CONNECTSW_SOURCE env var to the ConnectSW repo root."
  exit 1
fi

if [[ ! -d "$TARGET/.git" ]]; then
  echo "ERROR: Target is not a git repo: $TARGET"
  echo "Run 'git init' first."
  exit 1
fi

# Update mode: read company name from existing state.yml
if [[ "$MODE" == "update" ]]; then
  STATE_FILE="$TARGET/.claude/orchestrator/state.yml"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "ERROR: No state.yml found at $STATE_FILE"
    echo ""
    echo "The --update flag requires an existing ConnectSW installation."
    echo "If this is a fresh install, run:"
    echo "  setup-connectsw.sh <company-name>"
    exit 1
  fi
  COMPANY_NAME=$(awk -F'"' '/^ +name:/ {print $2; exit}' "$STATE_FILE")
  if [[ -z "$COMPANY_NAME" ]]; then
    echo "ERROR: Could not read company name from $STATE_FILE"
    echo "Ensure state.yml has a company.name field."
    exit 1
  fi
  # Also capture founded and ceo for restoration after generate-state
  ORIGINAL_FOUNDED=$(awk -F'"' '/^ +founded:/ {print $2; exit}' "$STATE_FILE")
  ORIGINAL_CEO=$(awk -F'"' '/^ +ceo:/ {print $2; exit}' "$STATE_FILE")
fi

# Install/force modes require company name
if [[ "$MODE" != "update" && -z "$COMPANY_NAME" ]]; then
  echo "Usage: setup-connectsw.sh <company-name> [--force]"
  echo "       setup-connectsw.sh --update"
  echo ""
  echo "  company-name  Name for the new company (e.g. MyCompany)"
  echo "  --force       Overwrite existing files"
  echo "  --update      Update framework files, preserve products & state"
  exit 1
fi

# Display mode label
case "$MODE" in
  install) MODE_LABEL="new install" ;;
  force)   MODE_LABEL="--force (full overwrite)" ;;
  update)  MODE_LABEL="--update (framework sync)" ;;
esac

echo "╔══════════════════════════════════════════════════╗"
echo "║   ConnectSW Agent System Setup                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Company:  $COMPANY_NAME"
echo "  Source:   $SOURCE"
echo "  Target:   $TARGET"
echo "  Mode:     $MODE_LABEL"
echo ""

# ─── Phase 0.5: Backup (update mode only) ───────────────────────────

if [[ "$MODE" == "update" ]]; then
  BACKUP_DIR="$TARGET/.claude.bak.$(date +%Y%m%d-%H%M%S)"
  echo "Phase 0.5: Creating backup..."
  cp -r "$TARGET/.claude" "$BACKUP_DIR"
  echo "  ✓ Backup created: $BACKUP_DIR"
  echo ""
fi

# ─── Phase 1: Copy directories ──────────────────────────────────────

# In update/force mode, overwrite; in install mode, skip existing
if [[ "$MODE" == "install" ]]; then
  RSYNC_FLAGS="-a --quiet --ignore-existing"
else
  RSYNC_FLAGS="-a --quiet"
fi

copy_dir() {
  local src="$1"
  local dst="$2"
  if [[ ! -d "$src" ]]; then
    return 0
  fi
  mkdir -p "$dst"
  rsync $RSYNC_FLAGS "$src/" "$dst/"
}

copy_file() {
  local src="$1"
  local dst="$2"
  if [[ ! -f "$src" ]]; then
    return 0
  fi
  if [[ "$MODE" != "install" ]] || [[ ! -f "$dst" ]]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

echo "Phase 1: Copying agent system directories..."

# .claude/ subdirectories
CLAUDE_DIRS=(
  agents
  commands
  engine
  workflows
  protocols
  quality-gates
  scripts
  standards
  templates
  advanced-features
  architecture
  resource-management
  dashboard
  monitoring
  checkpointing
  security
  mcp-tools
  audit
  checklists
  tests
)

for dir in "${CLAUDE_DIRS[@]}"; do
  copy_dir "$SOURCE/.claude/$dir" "$TARGET/.claude/$dir"
  echo "  ✓ .claude/$dir"
done

# Orchestrator (excluding state.yml)
mkdir -p "$TARGET/.claude/orchestrator"
rsync $RSYNC_FLAGS --exclude="state.yml" "$SOURCE/.claude/orchestrator/" "$TARGET/.claude/orchestrator/"
echo "  ✓ .claude/orchestrator (excluding state.yml)"

# CLAUDE.md
copy_file "$SOURCE/.claude/CLAUDE.md" "$TARGET/.claude/CLAUDE.md"
echo "  ✓ .claude/CLAUDE.md"

# README-UTILITIES.md
copy_file "$SOURCE/.claude/README-UTILITIES.md" "$TARGET/.claude/README-UTILITIES.md"
echo "  ✓ .claude/README-UTILITIES.md"

# .specify/ (spec-kit framework)
copy_dir "$SOURCE/.specify" "$TARGET/.specify"
echo "  ✓ .specify/"

# .github/ (selective — skip product-specific CI workflows)
copy_dir "$SOURCE/.github/ISSUE_TEMPLATE" "$TARGET/.github/ISSUE_TEMPLATE"
echo "  ✓ .github/ISSUE_TEMPLATE/"

copy_file "$SOURCE/.github/PULL_REQUEST_TEMPLATE.md" "$TARGET/.github/PULL_REQUEST_TEMPLATE.md"
echo "  ✓ .github/PULL_REQUEST_TEMPLATE.md"

copy_file "$SOURCE/.github/dependabot.yml" "$TARGET/.github/dependabot.yml"
echo "  ✓ .github/dependabot.yml"

# Command Center — core company dashboard (not a product, part of infrastructure)
if [[ -d "$SOURCE/products/command-center" ]]; then
  mkdir -p "$TARGET/products/command-center"
  rsync $RSYNC_FLAGS \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude=".vite" \
    --exclude="*.timestamp-*" \
    --exclude="test-results" \
    --exclude="playwright-report" \
    "$SOURCE/products/command-center/" "$TARGET/products/command-center/"
  echo "  ✓ products/command-center/ (company dashboard)"
fi

# docs/ (company-level documentation)
copy_dir "$SOURCE/docs" "$TARGET/docs"
echo "  ✓ docs/"

# packages/ (shared cross-product packages)
copy_dir "$SOURCE/packages" "$TARGET/packages"
echo "  ✓ packages/"

# .githooks/ (git safety hooks)
copy_dir "$SOURCE/.githooks" "$TARGET/.githooks"
if [[ -d "$TARGET/.githooks" ]]; then
  chmod +x "$TARGET/.githooks/"* 2>/dev/null || true
fi
echo "  ✓ .githooks/"

echo ""

# ─── Phase 2: Initialize state ──────────────────────────────────────

if [[ "$MODE" != "update" ]]; then
  # Install/Force: create fresh state from scratch
  echo "Phase 2: Initializing fresh state..."

  TODAY=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  TODAY_DATE=$(date -u +%Y-%m-%d)
  GIT_USER=$(git config user.name 2>/dev/null || echo "TBD")

  # state.yml (always fresh — never carry over product state)
  cat > "$TARGET/.claude/orchestrator/state.yml" <<YAML
# Auto-generated by setup-connectsw.sh on $TODAY_DATE
company:
  name: "$COMPANY_NAME"
  founded: "$TODAY_DATE"
  ceo: "$GIT_USER"

products: {}

worktrees: []
pending_decisions: []
checkpoints: []

last_updated: "$TODAY"
YAML
  echo "  ✓ .claude/orchestrator/state.yml"

  # Memory system — carry over all accumulated knowledge
  mkdir -p "$TARGET/.claude/memory/agent-experiences"
  mkdir -p "$TARGET/.claude/memory/metrics"

  # Copy documentation files
  copy_file "$SOURCE/.claude/memory/memory-system.md" "$TARGET/.claude/memory/memory-system.md"
  copy_file "$SOURCE/.claude/memory/relevance-scoring.md" "$TARGET/.claude/memory/relevance-scoring.md"

  # Copy accumulated knowledge (patterns, decisions, learnings)
  copy_file "$SOURCE/.claude/memory/company-knowledge.json" "$TARGET/.claude/memory/company-knowledge.json"
  copy_file "$SOURCE/.claude/memory/decision-log.json" "$TARGET/.claude/memory/decision-log.json"
  echo "  ✓ .claude/memory/company-knowledge.json (carried over)"
  echo "  ✓ .claude/memory/decision-log.json (carried over)"

  # Copy agent experiences (accumulated learnings per agent)
  copy_dir "$SOURCE/.claude/memory/agent-experiences" "$TARGET/.claude/memory/agent-experiences"
  echo "  ✓ .claude/memory/agent-experiences/ (carried over)"

  # Copy performance metrics
  copy_dir "$SOURCE/.claude/memory/metrics" "$TARGET/.claude/memory/metrics"
  echo "  ✓ .claude/memory/metrics/ (carried over)"

  # Empty audit trail
  : > "$TARGET/.claude/audit-trail.jsonl"
  echo "  ✓ .claude/audit-trail.jsonl (empty)"

  # Clean PORT-REGISTRY.md
  cat > "$TARGET/.claude/PORT-REGISTRY.md" <<'MDEOF'
# Port Registry

## Port Allocation Rules

| Range | Purpose |
|-------|---------|
| 3100-3199 | Frontend applications |
| 5000-5099 | Backend APIs |
| 8081-8099 | Mobile development servers |

## Port Assignment Process

When creating a new product, assign the next available port in each range.

## Registered Ports

### Frontend Applications (3100-3199)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 3113 | command-center | Active | http://localhost:3113 |

### Backend APIs (5000-5099)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 5009 | command-center | Active | http://localhost:5009 |

### Mobile Development (8081-8099)

| Port | Product | Status | URL |
|------|---------|--------|-----|

### Databases

Use default ports in Docker with unique container names per product.

## Quick Reference Commands

```bash
# Check if a port is in use
lsof -i :PORT_NUMBER

# Kill process on a port
kill -9 $(lsof -ti :PORT_NUMBER)
```
MDEOF
  echo "  ✓ .claude/PORT-REGISTRY.md (clean)"

  # COMPONENT-REGISTRY.md — carry over all shared components
  copy_file "$SOURCE/.claude/COMPONENT-REGISTRY.md" "$TARGET/.claude/COMPONENT-REGISTRY.md"
  echo "  ✓ .claude/COMPONENT-REGISTRY.md (carried over with shared components)"

else
  # Update mode: only update framework docs, preserve everything else
  echo "Phase 2: Updating framework docs (preserving state)..."

  # Update memory framework documentation
  mkdir -p "$TARGET/.claude/memory/agent-experiences"
  mkdir -p "$TARGET/.claude/memory/metrics"
  cp "$SOURCE/.claude/memory/memory-system.md" "$TARGET/.claude/memory/memory-system.md" 2>/dev/null || true
  cp "$SOURCE/.claude/memory/relevance-scoring.md" "$TARGET/.claude/memory/relevance-scoring.md" 2>/dev/null || true
  echo "  ✓ .claude/memory/memory-system.md (updated)"
  echo "  ✓ .claude/memory/relevance-scoring.md (updated)"

  # Update COMPONENT-REGISTRY.md (framework reference, safe to update)
  copy_file "$SOURCE/.claude/COMPONENT-REGISTRY.md" "$TARGET/.claude/COMPONENT-REGISTRY.md"
  echo "  ✓ .claude/COMPONENT-REGISTRY.md (updated)"

  # Explicitly list what was preserved
  echo ""
  echo "  Preserved (untouched):"
  echo "    ✓ .claude/orchestrator/state.yml"
  echo "    ✓ .claude/PORT-REGISTRY.md"
  echo "    ✓ .claude/memory/company-knowledge.json"
  echo "    ✓ .claude/memory/decision-log.json"
  echo "    ✓ .claude/memory/agent-experiences/"
  echo "    ✓ .claude/memory/metrics/"
  echo "    ✓ .claude/audit-trail.jsonl"
fi

echo ""

# ─── Phase 3: Replace company name ──────────────────────────────────

echo "Phase 3: Replacing 'ConnectSW' with '$COMPANY_NAME'..."

# Derive lowercase name for package scopes (@connectsw/ → @mycompany/)
COMPANY_LOWER=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]')

# Portable sed -i (macOS vs Linux)
sed_inplace() {
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Find all text files in copied directories and replace ConnectSW (both cases)
SEARCH_DIRS=(
  "$TARGET/.claude"
  "$TARGET/.specify"
  "$TARGET/.githooks"
  "$TARGET/.github"
  "$TARGET/products/command-center"
  "$TARGET/docs"
  "$TARGET/packages"
)

for search_dir in "${SEARCH_DIRS[@]}"; do
  if [[ -d "$search_dir" ]]; then
    find "$search_dir" -type f \( \
      -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
      -o -name "*.json" -o -name "*.sh" -o -name "*.ts" \
      -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
    \) 2>/dev/null | while read -r file; do
      # Replace PascalCase: ConnectSW → CompanyName
      if grep -q "ConnectSW" "$file" 2>/dev/null; then
        sed_inplace "s/ConnectSW/$COMPANY_NAME/g" "$file"
      fi
      # Replace lowercase: connectsw → companyname (package scopes, paths)
      if grep -q "connectsw" "$file" 2>/dev/null; then
        sed_inplace "s/connectsw/$COMPANY_LOWER/g" "$file"
      fi
    done
  fi
done

echo "  ✓ ConnectSW → $COMPANY_NAME (PascalCase)"
echo "  ✓ connectsw → $COMPANY_LOWER (lowercase — package scopes, paths)"
echo ""

# ─── Phase 4: Git setup ─────────────────────────────────────────────

echo "Phase 4: Configuring git..."

git -C "$TARGET" config core.hooksPath .githooks
echo "  ✓ Git hooks path set to .githooks"

# Ensure .gitignore exists and has required entries
touch "$TARGET/.gitignore"
GITIGNORE_ENTRIES=(
  ".claude/settings.local.json"
  ".claude/audit-trail.jsonl"
  ".claude.bak.*"
  ".DS_Store"
  "node_modules/"
  "dist/"
)
for entry in "${GITIGNORE_ENTRIES[@]}"; do
  if ! grep -qF "$entry" "$TARGET/.gitignore" 2>/dev/null; then
    echo "$entry" >> "$TARGET/.gitignore"
  fi
done
echo "  ✓ Updated .gitignore"

echo ""

# ─── Phase 5: Generate state ────────────────────────────────────────

if [[ -d "$TARGET/products" ]] && [[ -f "$TARGET/.claude/scripts/generate-state.sh" ]]; then
  echo "Phase 5: Generating state from existing products..."
  bash "$TARGET/.claude/scripts/generate-state.sh" 2>/dev/null || echo "  ⚠ State generation skipped (no products yet)"

  # In update mode, restore original company metadata that generate-state overwrites
  if [[ "$MODE" == "update" ]]; then
    STATE_FILE="$TARGET/.claude/orchestrator/state.yml"
    if [[ -n "${ORIGINAL_FOUNDED:-}" ]]; then
      sed_inplace "s|founded: \"[^\"]*\"|founded: \"$ORIGINAL_FOUNDED\"|" "$STATE_FILE"
      echo "  ✓ Restored founded date: $ORIGINAL_FOUNDED"
    fi
    if [[ -n "${ORIGINAL_CEO:-}" ]]; then
      sed_inplace "s|ceo: \"[^\"]*\"|ceo: \"$ORIGINAL_CEO\"|" "$STATE_FILE"
      echo "  ✓ Restored CEO: $ORIGINAL_CEO"
    fi
    # Also restore the company name (generate-state hardcodes "ConnectSW")
    sed_inplace "s|name: \"ConnectSW\"|name: \"$COMPANY_NAME\"|" "$STATE_FILE"
    echo "  ✓ Restored company name: $COMPANY_NAME"
  fi

  echo ""
fi

# ─── Phase 6: Summary ───────────────────────────────────────────────

DIR_COUNT=${#CLAUDE_DIRS[@]}

if [[ "$MODE" == "update" ]]; then
  echo "╔══════════════════════════════════════════════════╗"
  echo "║   Update Complete!                               ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  echo "Updated:"
  echo "  • $((DIR_COUNT)) agent directories in .claude/"
  echo "  • Orchestrator workflows (state.yml preserved)"
  echo "  • Command Center dashboard"
  echo "  • Memory framework docs"
  echo "  • Component registry"
  echo "  • spec-kit framework (.specify/)"
  echo "  • GitHub templates & git hooks"
  echo "  • docs/ & packages/"
  echo ""
  echo "Preserved:"
  echo "  • state.yml (company: $COMPANY_NAME, founded: ${ORIGINAL_FOUNDED:-}, ceo: ${ORIGINAL_CEO:-})"
  echo "  • PORT-REGISTRY.md (all product port assignments)"
  echo "  • company-knowledge.json, decision-log.json"
  echo "  • agent-experiences/, metrics/"
  echo "  • audit-trail.jsonl"
  echo "  • All products in products/ (except command-center)"
  echo "  • notes/"
  echo ""
  echo "Backup:"
  echo "  • ${BACKUP_DIR:-}"
  echo ""
  echo "To restore if something went wrong:"
  echo "  rm -rf .claude && cp -r ${BACKUP_DIR:-} .claude"
  echo ""
else
  echo "╔══════════════════════════════════════════════════╗"
  echo "║   Setup Complete!                                ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  echo "Installed:"
  echo "  • $((DIR_COUNT + 1)) agent system directories in .claude/"
  echo "  • Command Center dashboard (products/command-center/)"
  echo "  • Orchestrator with fresh state"
  echo "  • Memory system with accumulated knowledge & decisions"
  echo "  • Shared component registry (carried over)"
  echo "  • Git safety hooks (pre-commit, post-commit)"
  echo "  • spec-kit framework (.specify/)"
  echo "  • GitHub templates (issues, PRs, dependabot)"
  echo "  • docs/ & packages/"
  echo ""
  echo "Next steps:"
  echo "  1. Review .claude/CLAUDE.md and customize for your project"
  echo "  2. Install Command Center deps:"
  echo "     cd products/command-center && npm install"
  echo "  3. Start the dashboard:"
  echo "     cd products/command-center && npm run dev"
  echo "     → Web: http://localhost:3113  API: http://localhost:5009"
  echo "  4. Commit the setup: git add .claude .specify .githooks .github products/command-center docs packages"
  echo "  5. Run /orchestrator to start using the agent system"
  echo "  6. Create your first product:"
  echo "     /orchestrator New product: [your idea]"
  echo ""
fi
