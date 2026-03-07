#!/bin/bash
# Pre-commit Hook Script
# Compatible with Claude Code system - can be used as git hook or standalone
#
# Usage: .claude/scripts/pre-commit.sh [--staged-only]

set -e

STAGED_ONLY=${1:-}

echo "🔍 Running pre-commit checks..."

# Detect changed products
if [ "$STAGED_ONLY" = "--staged-only" ]; then
  CHANGED_FILES=$(git diff --cached --name-only)
else
  CHANGED_FILES=$(git diff --name-only)
fi

# Detect repo mode: monorepo (has products/) or single-repo
if [ -d "products" ]; then
  CHANGED_PRODUCTS=$(echo "$CHANGED_FILES" | grep -o 'products/[^/]*' | sort -u | cut -d'/' -f2 || true)
  REPO_MODE="monorepo"
else
  # Single-repo: treat the whole repo as one product
  if echo "$CHANGED_FILES" | grep -qE '\.(ts|tsx|js|jsx)$'; then
    CHANGED_PRODUCTS="$(basename "$(pwd)")"
  else
    CHANGED_PRODUCTS=""
  fi
  REPO_MODE="single"
fi

if [ -z "$CHANGED_PRODUCTS" ]; then
  echo "ℹ️  No product changes detected, skipping product-specific checks"
  exit 0
fi

# Check each changed product
for PRODUCT in $CHANGED_PRODUCTS; do
  # Resolve product directory
  if [ "$REPO_MODE" = "monorepo" ]; then
    PRODUCT_DIR="products/$PRODUCT"
  else
    PRODUCT_DIR="."
  fi

  if [ -d "$PRODUCT_DIR" ]; then
    echo ""
    echo "📦 Checking $PRODUCT..."

    # Run linting if package.json exists
    if [ -f "$PRODUCT_DIR/apps/web/package.json" ]; then
      echo "  → Checking frontend..."
      cd "$PRODUCT_DIR/apps/web"
      if npm run lint --if-present >> /dev/null 2>&1; then
        echo "  ✅ Frontend lint passed"
      else
        echo "  ⚠️  Frontend lint issues (non-blocking)"
      fi
      cd - > /dev/null
    fi

    if [ -f "$PRODUCT_DIR/apps/api/package.json" ]; then
      echo "  → Checking backend..."
      cd "$PRODUCT_DIR/apps/api"
      if npm run lint --if-present >> /dev/null 2>&1; then
        echo "  ✅ Backend lint passed"
      else
        echo "  ⚠️  Backend lint issues (non-blocking)"
      fi
      cd - > /dev/null
    fi

    # Secret scanning (if available)
    if command -v git-secrets > /dev/null 2>&1; then
      echo "  → Scanning for secrets..."
      if git-secrets --scan "$PRODUCT_DIR" >> /dev/null 2>&1; then
        echo "  ✅ No secrets detected"
      else
        echo "  ❌ Secrets detected! Please remove them."
        exit 1
      fi
    fi

    # Basic checks
    echo "  → Checking for common issues..."

    # Check for console.log in production code (warning only)
    SOURCE_PATTERN='\.(ts|tsx|js|jsx)$'
    if [ "$REPO_MODE" = "monorepo" ]; then
      SOURCE_PATTERN="products/$PRODUCT.*\.(ts|tsx|js|jsx)$"
    fi
    if echo "$CHANGED_FILES" | grep -E "$SOURCE_PATTERN" | xargs grep -l "console\.log" 2>/dev/null | head -1 > /dev/null; then
      echo "  ⚠️  Warning: console.log found in staged files (consider removing)"
    fi

    # Check for hardcoded API keys (basic pattern)
    if echo "$CHANGED_FILES" | grep -E "$SOURCE_PATTERN" | xargs grep -iE "(api[_-]?key|secret|password)\s*[:=]\s*['\"][^'\"]+['\"]" 2>/dev/null | head -1 > /dev/null; then
      echo "  ❌ Potential hardcoded credentials detected! Please use environment variables."
      exit 1
    fi
  fi
done

echo ""
echo "✅ Pre-commit checks passed!"
