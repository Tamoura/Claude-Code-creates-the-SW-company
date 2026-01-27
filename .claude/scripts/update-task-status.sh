#!/bin/bash
# update-task-status.sh
# Updates task status in a product task-graph.yml
# Usage: ./update-task-status.sh <product> <task_id> <status>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=$1
TASK_ID=$2
STATUS=$3

if [ -z "$PRODUCT" ] || [ -z "$TASK_ID" ] || [ -z "$STATUS" ]; then
  echo "Usage: $0 <product> <task_id> <status>"
  echo ""
  echo "Examples:"
  echo "  $0 gpu-calculator BACKEND-01 in_progress"
  echo "  $0 gpu-calculator BACKEND-01 completed"
  echo "  $0 gpu-calculator BACKEND-01 failed"
  exit 1
fi

TASK_GRAPH="$REPO_ROOT/products/$PRODUCT/.claude/task-graph.yml"

if [ ! -f "$TASK_GRAPH" ]; then
  echo "Error: Task graph not found: $TASK_GRAPH"
  exit 1
fi

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

export TASK_ID STATUS TIMESTAMP

if command -v yq &> /dev/null; then
  # Update task status and timestamps in YAML
  yq -i '
    (.tasks[] | select(.id == env(TASK_ID)) | .status = env(STATUS) |
      (if env(STATUS) == "in_progress" then
        .started_at = env(TIMESTAMP)
      elif env(STATUS) == "completed" or env(STATUS) == "failed" then
        .completed_at = env(TIMESTAMP)
      else
        .
      end)
    ) |
    .metadata.updated_at = env(TIMESTAMP)
  ' "$TASK_GRAPH"

  echo "✅ Updated $PRODUCT task $TASK_ID to status: $STATUS (YAML)"
  exit 0
fi

echo "⚠️  yq not installed. Attempting fallback update."

# Fallback 1: Use Python + PyYAML if available
if command -v python3 &> /dev/null && python3 - <<'PY' 2>/dev/null; then
import yaml  # noqa: F401
PY
  python3 - <<PY
import yaml
from datetime import datetime

task_id = "$TASK_ID"
status = "$STATUS"
timestamp = "$TIMESTAMP"
path = "$TASK_GRAPH"

with open(path, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

for task in data.get("tasks", []):
    if task.get("id") == task_id:
        task["status"] = status
        if status == "in_progress":
            task["started_at"] = timestamp
        elif status in ("completed", "failed"):
            task["completed_at"] = timestamp
        break

data.setdefault("metadata", {})["updated_at"] = timestamp

with open(path, "w", encoding="utf-8") as f:
    yaml.safe_dump(data, f, sort_keys=False)
PY

  echo "✅ Updated $PRODUCT task $TASK_ID to status: $STATUS (YAML via PyYAML)"
  exit 0
fi

# Fallback 2: Update JSON mirror if present
JSON_GRAPH="${TASK_GRAPH%.yml}.json"
if [ -f "$JSON_GRAPH" ] && command -v python3 &> /dev/null; then
  python3 - <<PY
import json
from datetime import datetime

task_id = "$TASK_ID"
status = "$STATUS"
timestamp = "$TIMESTAMP"
path = "$JSON_GRAPH"

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

for task in data.get("tasks", []):
    if task.get("id") == task_id:
        task["status"] = status
        if status == "in_progress":
            task["started_at"] = timestamp
        elif status in ("completed", "failed"):
            task["completed_at"] = timestamp
        break

data.setdefault("metadata", {})["updated_at"] = timestamp

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
PY

  echo "✅ Updated JSON mirror for $PRODUCT task $TASK_ID (YAML unchanged)"
  echo "   Install yq or PyYAML to update the YAML task graph."
  exit 0
fi

echo "❌ Could not update task graph."
echo "Install yq (recommended) or PyYAML:"
echo "  brew install yq"
echo "  python3 -m pip install pyyaml"
exit 1
