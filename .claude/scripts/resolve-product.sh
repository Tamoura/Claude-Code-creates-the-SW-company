#!/bin/bash
# resolve-product.sh
# Shared helper that resolves PRODUCT_DIR for both monorepo and single-repo layouts.
#
# Monorepo mode: products/{PRODUCT}/apps/api/, products/{PRODUCT}/apps/web/
# Single-repo mode: apps/api/, apps/web/ (code at repo root, no products/ wrapper)
#
# Usage: source this file after setting REPO_ROOT and PRODUCT
#
#   REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
#   PRODUCT="${1:-}"
#   source "$REPO_ROOT/.claude/scripts/resolve-product.sh"
#   # Now use $PRODUCT_DIR
#
# Detection logic:
#   1. If products/$PRODUCT exists → monorepo mode
#   2. If apps/ exists at repo root → single-repo mode (PRODUCT_DIR = REPO_ROOT)
#   3. Otherwise → error
#
# Exports: PRODUCT_DIR, REPO_MODE

if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: REPO_ROOT must be set before sourcing resolve-product.sh"
  return 1 2>/dev/null || exit 1
fi

# Detect repo mode
if [ -n "$PRODUCT" ] && [ -d "$REPO_ROOT/products/$PRODUCT" ]; then
  REPO_MODE="monorepo"
  PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"
elif [ -d "$REPO_ROOT/apps" ] || [ -f "$REPO_ROOT/package.json" ]; then
  REPO_MODE="single"
  PRODUCT_DIR="$REPO_ROOT"
  # In single-repo mode, derive PRODUCT from directory name if not set
  if [ -z "$PRODUCT" ]; then
    PRODUCT="$(basename "$REPO_ROOT")"
  fi
elif [ -n "$PRODUCT" ]; then
  # Product specified but not found in either mode
  echo "WARNING: Product '$PRODUCT' not found at products/$PRODUCT and no apps/ at repo root"
  REPO_MODE="unknown"
  PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"
else
  REPO_MODE="single"
  PRODUCT_DIR="$REPO_ROOT"
  PRODUCT="$(basename "$REPO_ROOT")"
fi

export PRODUCT_DIR REPO_MODE PRODUCT
