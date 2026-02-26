#!/usr/bin/env bash
# Packages all E2E proof artifacts into a timestamped archive for sharing
set -e

PRODUCT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROOF_DIR="$PRODUCT_DIR/e2e-proof"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="$PRODUCT_DIR/e2e-proof-$TIMESTAMP.zip"

if [ ! -d "$PROOF_DIR" ]; then
  echo "No proof directory found at $PROOF_DIR"
  echo "Run 'npx playwright test' first."
  exit 1
fi

cd "$PRODUCT_DIR"
zip -r "$ARCHIVE" e2e-proof/
echo ""
echo "Proof archive created: $ARCHIVE"
echo "Share this file to let anyone verify feature recordings."
echo ""
echo "To view HTML report: npx playwright show-report e2e-proof"
