#!/bin/bash
# instantiate-task-graph.sh
# Creates a task graph from a template with placeholder substitution
# Usage: ./instantiate-task-graph.sh <template> <product> [params]
# Example: ./instantiate-task-graph.sh new-feature gpu-calculator "FEATURE=dark-mode,FEATURE_ID=DM01"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TEMPLATE=$1
PRODUCT=$2
PARAMS=$3

if [ -z "$TEMPLATE" ] || [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <template> <product> [params]"
  echo ""
  echo "Templates: new-product, new-feature, bug-fix, release, hotfix"
  echo ""
  echo "Examples:"
  echo "  $0 new-feature gpu-calculator \"FEATURE=dark-mode,FEATURE_ID=DM01\""
  echo "  $0 release gpu-calculator \"VERSION=1.2.0\""
  echo "  $0 hotfix gpu-calculator \"HOTFIX_ID=HF01,ISSUE=Login broken,SEVERITY=critical\""
  exit 1
fi

TEMPLATE_FILE="$REPO_ROOT/.claude/workflows/templates/${TEMPLATE}-tasks.yml"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Error: Template not found: $TEMPLATE_FILE"
  echo ""
  echo "Available templates:"
  ls -1 "$REPO_ROOT/.claude/workflows/templates/" | sed 's/-tasks.yml//'
  exit 1
fi

echo "Creating task graph from template: $TEMPLATE"
echo "Product: $PRODUCT"

# Read template
OUTPUT=$(cat "$TEMPLATE_FILE")

# Standard substitutions
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OUTPUT="${OUTPUT//\{PRODUCT\}/$PRODUCT}"
OUTPUT="${OUTPUT//\{TIMESTAMP\}/$TIMESTAMP}"

# Parse additional params (KEY=VALUE,KEY2=VALUE2)
if [ -n "$PARAMS" ]; then
  echo "Parameters: $PARAMS"
  
  IFS=',' read -ra PAIRS <<< "$PARAMS"
  for pair in "${PAIRS[@]}"; do
    KEY="${pair%%=*}"
    VALUE="${pair#*=}"
    # Escape special characters in value for sed
    VALUE_ESCAPED=$(echo "$VALUE" | sed 's/[&/\]/\\&/g')
    OUTPUT=$(echo "$OUTPUT" | sed "s/{$KEY}/$VALUE_ESCAPED/g")
  done
fi

# Create product directory if needed
mkdir -p "$REPO_ROOT/products/$PRODUCT/.claude"

# Validate no placeholders remain
if echo "$OUTPUT" | grep -q '{[A-Z_]*}'; then
  echo "❌ Error: Unsubstituted placeholders found in task graph:"
  echo ""
  echo "$OUTPUT" | grep -o '{[A-Z_]*}' | sort -u
  echo ""
  echo "Please provide values for all placeholders via PARAMS argument."
  exit 1
fi

# Save task graph
OUTPUT_FILE="$REPO_ROOT/products/$PRODUCT/.claude/task-graph.yml"
echo "$OUTPUT" > "$OUTPUT_FILE"

echo ""
echo "✅ Task graph created: $OUTPUT_FILE"
echo ""

# Show summary
TASK_COUNT=$(grep -c "^  - id:" "$OUTPUT_FILE" || echo "0")
CHECKPOINT_COUNT=$(grep -c "checkpoint: true" "$OUTPUT_FILE" || echo "0")

echo "Summary:"
echo "  Tasks: $TASK_COUNT"
echo "  Checkpoints: $CHECKPOINT_COUNT"
echo ""
echo "Next: Orchestrator can now execute this task graph"
