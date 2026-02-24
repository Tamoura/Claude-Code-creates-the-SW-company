#!/bin/bash
# documentation-gate.sh
# Validates documentation quality per Constitution Article IX (Diagram-First Principle).
# Checks for Mermaid diagrams, section coverage, and diagram type diversity.
#
# Usage: .claude/scripts/documentation-gate.sh <product>
# Output: PASS/FAIL/WARN + report file + GATE_REPORT_FILE=<path>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=$1
if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product>"
  echo "Example: $0 archforge"
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"
if [ ! -d "$PRODUCT_DIR" ]; then
  echo "Error: Product directory not found: $PRODUCT_DIR"
  exit 1
fi

TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
REPORT_DIR="$PRODUCT_DIR/docs/quality-reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/documentation-gate-$TIMESTAMP.md"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_CHECKS=0
DETAILS=""

# Helper: count mermaid blocks in a file
count_mermaid() {
  local file="$1"
  if [ -f "$file" ]; then
    grep -c '```mermaid' "$file" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

# Helper: count distinct mermaid diagram types in a file
count_diagram_types() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "0"
    return
  fi
  local types=0
  grep -q 'graph\|flowchart' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'sequenceDiagram' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'erDiagram' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'stateDiagram' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'classDiagram' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'gantt' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'gitgraph' "$file" 2>/dev/null && types=$((types + 1))
  grep -q 'mindmap' "$file" 2>/dev/null && types=$((types + 1))
  echo "$types"
}

# Helper: check for long sections without diagrams
check_long_sections() {
  local file="$1"
  local threshold=${2:-500}
  if [ ! -f "$file" ]; then
    echo "0"
    return
  fi
  # Count sections (## headers) that have >threshold words before next ## or mermaid block
  local warnings=0
  local current_words=0
  local in_section=false
  while IFS= read -r line; do
    if echo "$line" | grep -qE '^##\s'; then
      if [ "$in_section" = true ] && [ "$current_words" -gt "$threshold" ]; then
        warnings=$((warnings + 1))
      fi
      current_words=0
      in_section=true
    elif echo "$line" | grep -q '```mermaid'; then
      current_words=0
    else
      word_count=$(echo "$line" | wc -w | tr -d ' ')
      current_words=$((current_words + word_count))
    fi
  done < "$file"
  # Check last section
  if [ "$in_section" = true ] && [ "$current_words" -gt "$threshold" ]; then
    warnings=$((warnings + 1))
  fi
  echo "$warnings"
}

record() {
  local status="$1"
  local check="$2"
  local detail="$3"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  case "$status" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)); DETAILS="$DETAILS\n- ✅ **$check**: $detail" ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)); DETAILS="$DETAILS\n- ❌ **$check**: $detail" ;;
    WARN) WARN_COUNT=$((WARN_COUNT + 1)); DETAILS="$DETAILS\n- ⚠️ **$check**: $detail" ;;
  esac
}

echo "=== Documentation Quality Gate: $PRODUCT ==="
echo ""

# ============================================================================
# CHECK 1: PRD contains >= 3 Mermaid diagrams
# ============================================================================
PRD_FILE="$PRODUCT_DIR/docs/PRD.md"
if [ -f "$PRD_FILE" ]; then
  PRD_DIAGRAMS=$(count_mermaid "$PRD_FILE")
  if [ "$PRD_DIAGRAMS" -ge 3 ]; then
    record "PASS" "PRD Diagrams" "PRD has $PRD_DIAGRAMS Mermaid diagrams (>= 3 required)"
  else
    record "FAIL" "PRD Diagrams" "PRD has only $PRD_DIAGRAMS Mermaid diagrams (>= 3 required)"
  fi
else
  record "WARN" "PRD Diagrams" "No PRD.md found at $PRD_FILE"
fi

# ============================================================================
# CHECK 2: Architecture docs contain diagrams
# ============================================================================
ARCH_FILE="$PRODUCT_DIR/docs/architecture.md"
if [ -f "$ARCH_FILE" ]; then
  ARCH_DIAGRAMS=$(count_mermaid "$ARCH_FILE")
  if [ "$ARCH_DIAGRAMS" -ge 2 ]; then
    record "PASS" "Architecture Diagrams" "Architecture has $ARCH_DIAGRAMS Mermaid diagrams (>= 2 required)"
  else
    record "FAIL" "Architecture Diagrams" "Architecture has only $ARCH_DIAGRAMS Mermaid diagrams (>= 2 required)"
  fi
else
  record "WARN" "Architecture Diagrams" "No architecture.md found at $ARCH_FILE"
fi

# ============================================================================
# CHECK 3: README contains >= 1 diagram
# ============================================================================
README_FILE="$PRODUCT_DIR/README.md"
if [ -f "$README_FILE" ]; then
  README_DIAGRAMS=$(count_mermaid "$README_FILE")
  if [ "$README_DIAGRAMS" -ge 1 ]; then
    record "PASS" "README Diagrams" "README has $README_DIAGRAMS Mermaid diagrams (>= 1 required)"
  else
    record "FAIL" "README Diagrams" "README has 0 Mermaid diagrams (>= 1 required)"
  fi
else
  record "WARN" "README Diagrams" "No README.md found at $README_FILE"
fi

# ============================================================================
# CHECK 4: PRD diagram type diversity (>= 3 distinct types)
# ============================================================================
if [ -f "$PRD_FILE" ]; then
  PRD_TYPES=$(count_diagram_types "$PRD_FILE")
  if [ "$PRD_TYPES" -ge 3 ]; then
    record "PASS" "Diagram Type Diversity" "PRD uses $PRD_TYPES distinct diagram types (>= 3 required)"
  elif [ "$PRD_TYPES" -ge 2 ]; then
    record "WARN" "Diagram Type Diversity" "PRD uses $PRD_TYPES distinct diagram types (>= 3 recommended)"
  else
    record "FAIL" "Diagram Type Diversity" "PRD uses only $PRD_TYPES distinct diagram types (>= 3 required)"
  fi
fi

# ============================================================================
# CHECK 5: Warn for sections > 500 words without diagrams
# ============================================================================
LONG_SECTIONS=0
for doc in "$PRD_FILE" "$ARCH_FILE" "$README_FILE"; do
  if [ -f "$doc" ]; then
    doc_warnings=$(check_long_sections "$doc" 500)
    LONG_SECTIONS=$((LONG_SECTIONS + doc_warnings))
  fi
done
if [ "$LONG_SECTIONS" -gt 0 ]; then
  record "WARN" "Long Sections" "$LONG_SECTIONS sections exceed 500 words without a diagram"
else
  record "PASS" "Long Sections" "No sections exceed 500 words without a diagram"
fi

# ============================================================================
# CHECK 6: Feature specs contain diagrams (if any exist)
# ============================================================================
SPEC_DIR="$PRODUCT_DIR/docs/specs"
if [ -d "$SPEC_DIR" ]; then
  SPEC_COUNT=0
  SPEC_WITH_DIAGRAMS=0
  for spec in "$SPEC_DIR"/*.md; do
    [ -f "$spec" ] || continue
    SPEC_COUNT=$((SPEC_COUNT + 1))
    spec_diagrams=$(count_mermaid "$spec")
    if [ "$spec_diagrams" -gt 0 ]; then
      SPEC_WITH_DIAGRAMS=$((SPEC_WITH_DIAGRAMS + 1))
    fi
  done
  if [ "$SPEC_COUNT" -gt 0 ]; then
    if [ "$SPEC_WITH_DIAGRAMS" -eq "$SPEC_COUNT" ]; then
      record "PASS" "Feature Specs" "All $SPEC_COUNT feature specs contain diagrams"
    else
      MISSING=$((SPEC_COUNT - SPEC_WITH_DIAGRAMS))
      record "WARN" "Feature Specs" "$MISSING of $SPEC_COUNT feature specs missing diagrams"
    fi
  fi
fi

# ============================================================================
# CHECK 7: ADRs contain before/after diagrams (Article IX requirement)
# ============================================================================
ADR_DIR="$PRODUCT_DIR/docs/ADRs"
if [ -d "$ADR_DIR" ]; then
  ADR_COUNT=0
  ADR_WITH_DIAGRAMS=0
  for adr in "$ADR_DIR"/*.md; do
    [ -f "$adr" ] || continue
    ADR_COUNT=$((ADR_COUNT + 1))
    adr_diagrams=$(count_mermaid "$adr")
    if [ "$adr_diagrams" -ge 2 ]; then
      ADR_WITH_DIAGRAMS=$((ADR_WITH_DIAGRAMS + 1))
    fi
  done
  if [ "$ADR_COUNT" -gt 0 ]; then
    if [ "$ADR_WITH_DIAGRAMS" -eq "$ADR_COUNT" ]; then
      record "PASS" "ADR Diagrams" "All $ADR_COUNT ADRs contain >= 2 diagrams (before/after)"
    else
      MISSING=$((ADR_COUNT - ADR_WITH_DIAGRAMS))
      record "FAIL" "ADR Diagrams" "$MISSING of $ADR_COUNT ADRs missing before/after diagrams (>= 2 required per Article IX)"
    fi
  fi
fi

# ============================================================================
# DETERMINE OVERALL RESULT
# ============================================================================
if [ "$FAIL_COUNT" -gt 0 ]; then
  OVERALL="FAIL"
elif [ "$WARN_COUNT" -gt 0 ]; then
  OVERALL="WARN"
else
  OVERALL="PASS"
fi

# ============================================================================
# GENERATE REPORT
# ============================================================================
cat > "$REPORT_FILE" << REPORTEOF
# Documentation Quality Gate Report

**Product**: $PRODUCT
**Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Status**: $OVERALL

## Results ($PASS_COUNT passed, $FAIL_COUNT failed, $WARN_COUNT warnings)

$(echo -e "$DETAILS")

## Gate Rules (Constitution Article IX)

| Document | Minimum Diagrams | Minimum Distinct Types |
|----------|-----------------|----------------------|
| PRD | 3 (C4, ER, sequence/flowchart) | 3 |
| Architecture | 2 | 2 |
| README | 1 | 1 |
| Feature Specs | 1 per spec | 1 |
| ADRs | 2 (before/after) | 2 |

## Enforcement

- **FAIL**: Missing required diagrams. Must fix before CEO checkpoint.
- **WARN**: Recommended improvements. Can proceed but should address.
- **PASS**: Documentation meets Article IX standards.
REPORTEOF

echo ""
echo "=== Documentation Gate: $OVERALL ==="
echo "  Passed: $PASS_COUNT / $TOTAL_CHECKS"
echo "  Failed: $FAIL_COUNT / $TOTAL_CHECKS"
echo "  Warnings: $WARN_COUNT / $TOTAL_CHECKS"
echo ""
echo "GATE_REPORT_FILE=$REPORT_FILE"

# Exit with appropriate code
if [ "$OVERALL" = "FAIL" ]; then
  exit 1
else
  exit 0
fi
