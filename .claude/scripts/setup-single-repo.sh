#!/bin/bash
#
# setup-single-repo.sh
# Bootstrap ConnectSW agent system in a single-product repo.
#
# Usage: bash setup-single-repo.sh <source-repo-path> [company-name]
#
#   source-repo-path: Path to the ConnectSW monorepo (source of agent system)
#   company-name:     Optional company name to replace "ConnectSW" (default: keep ConnectSW)
#
# This copies the agent system (.claude/, .specify/, .githooks/) into the
# current directory, configured for single-repo mode (no products/ folder).
#
# The target repo should already have apps/api/ and/or apps/web/ structure.
#
# What it copies:
#   .claude/agents/briefs/     - Compact agent briefs (not full 800-line defs)
#   .claude/protocols/         - All quality/process protocols
#   .claude/scripts/           - Quality gate scripts (all support single-repo)
#   .claude/ci/                - Known CI issues registry
#   .claude/quality-gates/     - Gate definitions + executor
#   .claude/commands/          - Slash commands
#   .claude/orchestrator/      - Orchestrator (works in single-product mode)
#   .claude/engine/            - Task graph engine
#   .claude/memory/            - Agent memory system (empty experiences)
#   .claude/templates/         - Doc templates
#   .specify/                  - Spec-kit framework
#   .githooks/                 - Git safety hooks
#
# What it does NOT copy:
#   .claude/agents/*.md        - Full agent definitions (too large, briefs suffice)
#   products/                  - No products folder in single-repo
#   packages/                  - Shared packages stay in the org-level repo
#   command-center/            - Not needed for single-repo

set -euo pipefail

SOURCE="${1:-}"
COMPANY="${2:-ConnectSW}"

if [ -z "$SOURCE" ]; then
  echo "Usage: $0 <source-connectsw-repo-path> [company-name]"
  echo ""
  echo "Example:"
  echo "  cd /path/to/my-product-repo"
  echo "  bash /path/to/connectsw/setup-single-repo.sh /path/to/connectsw MyCompany"
  exit 1
fi

if [ ! -d "$SOURCE/.claude" ]; then
  echo "ERROR: $SOURCE does not look like a ConnectSW repo (no .claude/ directory)"
  exit 1
fi

TARGET="$(pwd)"
echo "Setting up ConnectSW agent system (single-repo mode)"
echo "  Source: $SOURCE"
echo "  Target: $TARGET"
echo "  Company: $COMPANY"
echo ""

# Copy agent briefs (compact versions)
echo "Copying agent briefs..."
mkdir -p "$TARGET/.claude/agents/briefs"
cp -r "$SOURCE/.claude/agents/briefs/"* "$TARGET/.claude/agents/briefs/" 2>/dev/null || true

# Copy protocols
echo "Copying protocols..."
mkdir -p "$TARGET/.claude/protocols"
cp -r "$SOURCE/.claude/protocols/"* "$TARGET/.claude/protocols/" 2>/dev/null || true

# Copy scripts
echo "Copying scripts..."
mkdir -p "$TARGET/.claude/scripts"
cp -r "$SOURCE/.claude/scripts/"* "$TARGET/.claude/scripts/" 2>/dev/null || true

# Copy CI known issues
echo "Copying CI config..."
mkdir -p "$TARGET/.claude/ci"
cp -r "$SOURCE/.claude/ci/"* "$TARGET/.claude/ci/" 2>/dev/null || true

# Copy quality gates
echo "Copying quality gates..."
mkdir -p "$TARGET/.claude/quality-gates"
cp -r "$SOURCE/.claude/quality-gates/"* "$TARGET/.claude/quality-gates/" 2>/dev/null || true

# Copy commands
echo "Copying slash commands..."
mkdir -p "$TARGET/.claude/commands"
cp -r "$SOURCE/.claude/commands/"* "$TARGET/.claude/commands/" 2>/dev/null || true

# Copy orchestrator
echo "Copying orchestrator..."
mkdir -p "$TARGET/.claude/orchestrator"
cp -r "$SOURCE/.claude/orchestrator/"* "$TARGET/.claude/orchestrator/" 2>/dev/null || true

# Copy engine
echo "Copying task graph engine..."
mkdir -p "$TARGET/.claude/engine"
cp -r "$SOURCE/.claude/engine/"* "$TARGET/.claude/engine/" 2>/dev/null || true

# Copy templates
echo "Copying templates..."
mkdir -p "$TARGET/.claude/templates"
cp -r "$SOURCE/.claude/templates/"* "$TARGET/.claude/templates/" 2>/dev/null || true

# Copy workflow templates
echo "Copying workflow templates..."
mkdir -p "$TARGET/.claude/workflows/templates"
cp -r "$SOURCE/.claude/workflows/templates/"* "$TARGET/.claude/workflows/templates/" 2>/dev/null || true

# Copy memory system structure (empty experiences)
echo "Copying memory system..."
mkdir -p "$TARGET/.claude/memory/agent-experiences"
cp "$SOURCE/.claude/memory/memory-system.md" "$TARGET/.claude/memory/" 2>/dev/null || true
# Create empty company knowledge
if [ ! -f "$TARGET/.claude/memory/company-knowledge.json" ]; then
  echo '{"patterns":[],"decisions":[],"lessons":[]}' > "$TARGET/.claude/memory/company-knowledge.json"
fi

# Copy spec-kit
echo "Copying spec-kit..."
mkdir -p "$TARGET/.specify"
cp -r "$SOURCE/.specify/"* "$TARGET/.specify/" 2>/dev/null || true

# Copy git hooks
echo "Copying git hooks..."
mkdir -p "$TARGET/.githooks"
cp -r "$SOURCE/.githooks/"* "$TARGET/.githooks/" 2>/dev/null || true

# Copy key registries (as starting templates)
for registry in COMPONENT-REGISTRY.md PORT-REGISTRY.md; do
  if [ -f "$SOURCE/.claude/$registry" ] && [ ! -f "$TARGET/.claude/$registry" ]; then
    cp "$SOURCE/.claude/$registry" "$TARGET/.claude/$registry"
  fi
done

# Create CLAUDE.md for the product (if it doesn't exist)
if [ ! -f "$TARGET/.claude/CLAUDE.md" ]; then
  cp "$SOURCE/.claude/CLAUDE.md" "$TARGET/.claude/CLAUDE.md"
fi

# Create docs structure
echo "Creating docs structure..."
mkdir -p "$TARGET/docs/specs" "$TARGET/docs/ADRs" "$TARGET/docs/quality-reports"

# Set git hooks path
echo "Configuring git hooks..."
if git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "$TARGET" config core.hooksPath .githooks
  echo "  Set core.hooksPath to .githooks"
else
  echo "  WARNING: Not a git repo, skipping hooks config"
fi

# Replace company name if different from ConnectSW
if [ "$COMPANY" != "ConnectSW" ]; then
  echo "Replacing ConnectSW with $COMPANY..."
  find "$TARGET/.claude" "$TARGET/.specify" -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" 2>/dev/null | while read -r file; do
    if grep -q "ConnectSW" "$file" 2>/dev/null; then
      sed -i.bak "s/ConnectSW/$COMPANY/g" "$file"
      rm -f "$file.bak"
    fi
  done
fi

echo ""
echo "Done! ConnectSW agent system installed in single-repo mode."
echo ""
echo "Next steps:"
echo "  1. Review .claude/CLAUDE.md and customize for your product"
echo "  2. Review .claude/PORT-REGISTRY.md and set your ports"
echo "  3. Create docs/PRD.md for your product"
echo "  4. Test: run 'bash .claude/scripts/ci-preflight.sh'"
echo "  5. Commit the .claude/, .specify/, and .githooks/ directories"
echo ""
echo "To use the orchestrator: /orchestrator <your request>"
