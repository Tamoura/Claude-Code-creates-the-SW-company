#!/bin/bash
# extract-patterns.sh
# Reads recent git diffs and identifies code patterns.
# Generates candidate entries for company-knowledge.json.
#
# Usage: .claude/scripts/extract-patterns.sh [product] [days]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=${1:-"stablecoin-gateway"}
DAYS=${2:-30}

echo "Extracting patterns from $PRODUCT (last $DAYS days)"
echo ""

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "Error: Product directory not found: $PRODUCT_DIR"
  exit 1
fi

echo "=== File Types ==="
git -C "$REPO_ROOT" log --since="${DAYS} days ago" --name-only --diff-filter=AM -- "products/$PRODUCT/" 2>/dev/null | \
  grep -E '\.(ts|tsx|js|json|prisma)$' | sort -u | \
  sed 's/.*\.//' | sort | uniq -c | sort -rn

echo ""
echo "=== Recurring Patterns (files modified 3+ times) ==="
git -C "$REPO_ROOT" log --since="${DAYS} days ago" --name-only -- "products/$PRODUCT/" 2>/dev/null | \
  grep -E '\.(ts|tsx)$' | sort | uniq -c | sort -rn | head -10

echo ""
echo "=== Import Patterns ==="
if [ -d "$PRODUCT_DIR/apps/api/src" ]; then
  echo "Common imports in services:"
  grep -rh "^import" "$PRODUCT_DIR/apps/api/src/services/" 2>/dev/null | \
    sort | uniq -c | sort -rn | head -10
  echo ""
  echo "Common imports in routes:"
  grep -rh "^import" "$PRODUCT_DIR/apps/api/src/routes/" 2>/dev/null | \
    sort | uniq -c | sort -rn | head -10
fi

echo ""
echo "=== Test Patterns ==="
if [ -d "$PRODUCT_DIR/apps/api/tests" ]; then
  echo "Test helper functions used:"
  grep -rh "buildApp\|app\.inject\|beforeAll\|afterAll\|app\.prisma" "$PRODUCT_DIR/apps/api/tests/" 2>/dev/null | \
    sort | uniq -c | sort -rn | head -10
fi

echo ""
echo "=== Error Handling ==="
if [ -d "$PRODUCT_DIR/apps/api/src" ]; then
  echo "AppError usage:"
  grep -rh "throw new AppError" "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | \
    sort | uniq -c | sort -rn | head -10
fi

echo ""
echo "=== Candidate Patterns for company-knowledge.json ==="
echo ""
echo "Review the output above and add relevant patterns to:"
echo "  .claude/memory/company-knowledge.json"
echo ""
echo "Format:"
echo '  { "id": "PATTERN-NNN", "name": "...", "category": "backend|testing|security",'
echo '    "confidence": "low", "learned_from": { "product": "'$PRODUCT'" } }'
