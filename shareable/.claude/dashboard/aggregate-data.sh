#!/bin/bash
# Dashboard Data Aggregator
# Compatible with Claude Code system - aggregates metrics for dashboard display
#
# Usage: .claude/dashboard/aggregate-data.sh [view]
# Views: executive, performance, costs, products, status

set -e

VIEW=${1:-executive}
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
METRICS_DIR="$REPO_ROOT/.claude/memory/metrics"
STATE_FILE="$REPO_ROOT/.claude/orchestrator/state.yml"

# Helper to read JSON files safely
read_json() {
  local file=$1
  if [ -f "$file" ]; then
    cat "$file" 2>/dev/null || echo "{}"
  else
    echo "{}"
  fi
}

# Helper to read YAML values (simple extraction)
read_yaml_value() {
  local file=$1
  local key=$2
  grep "^$key:" "$file" 2>/dev/null | head -1 | cut -d':' -f2 | xargs || echo ""
}

case $VIEW in
  executive)
    {
      echo "# ConnectSW Dashboard - Executive Summary"
      echo "**Updated**: $(date -Iseconds)"
      echo ""
      
      # Read metrics
      AGENT_PERF=$(read_json "$METRICS_DIR/agent-performance.json")
      COST_METRICS=$(read_json "$METRICS_DIR/cost-metrics.json")
      RESOURCE_METRICS=$(read_json "$METRICS_DIR/resource-metrics.json")
      
      # Calculate totals
      TOTAL_TASKS=0
      SUCCESS_TASKS=0
      if command -v jq > /dev/null 2>&1; then
        TOTAL_TASKS=$(echo "$AGENT_PERF" | jq '[.agents[].tasks_completed // 0] | add // 0')
        SUCCESS_TASKS=$(echo "$AGENT_PERF" | jq '[.agents[] | (.tasks_completed // 0) * (.success_rate // 0)] | add // 0')
      fi
      
      SUCCESS_RATE=0
      if [ "$TOTAL_TASKS" -gt 0 ]; then
        SUCCESS_RATE=$(echo "scale=2; $SUCCESS_TASKS * 100 / $TOTAL_TASKS" | bc 2>/dev/null || echo "0")
      fi
      
      echo "## 📊 Today's Activity"
      echo "- Tasks completed: $TOTAL_TASKS"
      echo "- Success rate: ${SUCCESS_RATE}%"
      echo ""
      
      # Resource usage
      DAILY_COST=$(echo "$COST_METRICS" | jq -r '.daily_cost // 0' 2>/dev/null || echo "0")
      TOKENS_USED=$(echo "$RESOURCE_METRICS" | jq -r '.tokens_used // 0' 2>/dev/null || echo "0")
      
      echo "## 💰 Resource Usage"
      echo "- Cost: \$$DAILY_COST / \$100 daily limit"
      echo "- Tokens: $TOKENS_USED / 2M"
      echo ""
      
      # Products
      echo "## 🏗️ Products"
      if [ -f "$STATE_FILE" ]; then
        PRODUCTS=$(grep "^  [a-z-]*:" "$STATE_FILE" | cut -d':' -f1 | xargs)
        for PRODUCT in $PRODUCTS; do
          echo "- $PRODUCT"
        done
      fi
      echo ""
      
      echo "## ⚠️ Alerts"
      if [ -z "$ALERTS" ]; then
        echo "- No active alerts"
      fi
    }
    ;;
    
  performance)
    {
      echo "# Agent Performance"
      echo "**Period**: Last 7 days"
      echo ""
      
      AGENT_PERF=$(read_json "$METRICS_DIR/agent-performance.json")
      
      if command -v jq > /dev/null 2>&1; then
        echo "$AGENT_PERF" | jq '.agents'
      else
        echo "$AGENT_PERF"
      fi
    }
    ;;
    
  costs)
    {
      echo "# Cost Tracking"
      echo ""
      
      COST_METRICS=$(read_json "$METRICS_DIR/cost-metrics.json")
      
      if command -v jq > /dev/null 2>&1; then
        echo "$COST_METRICS" | jq '.'
      else
        echo "$COST_METRICS"
      fi
    }
    ;;
    
  products)
    {
      echo "# Products Status"
      echo ""
      
      if [ -f "$STATE_FILE" ]; then
        echo "```yaml"
        cat "$STATE_FILE"
        echo "```"
      else
        echo "No state file found"
      fi
    }
    ;;
    
  status)
    {
      echo "# Current Status"
      echo "**Updated**: $(date -Iseconds)"
      echo ""
      
      echo "## Active Work"
      echo "- Checking for active tasks..."
      echo ""
      
      # Check for active task graphs
      for PRODUCT_DIR in "$REPO_ROOT/products"/*; do
        if [ -d "$PRODUCT_DIR" ]; then
          PRODUCT=$(basename "$PRODUCT_DIR")
          TASK_GRAPH="$PRODUCT_DIR/.claude/task-graph.yml"
          if [ -f "$TASK_GRAPH" ]; then
            echo "### $PRODUCT"
            echo "- Has active task graph"
            # Could parse YAML to show task status
          fi
        fi
      done
    }
    ;;
    
  *)
    echo "Unknown view: $VIEW"
    echo "Available views: executive, performance, costs, products, status"
    exit 1
    ;;
esac
