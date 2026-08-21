#!/bin/bash
# Task Graph Utilities
# Compatible with Claude Code system - helper functions for task graph operations
#
# Usage: source .claude/engine/task-graph-utils.sh
# Then use functions like: get_ready_tasks "products/gpu-calculator"

# Requires: yq (YAML processor) - install with: brew install yq or apt-get install yq

# Get ready tasks (tasks where all dependencies are complete)
get_ready_tasks() {
  local product_path=$1
  local task_graph="$product_path/.claude/task-graph.yml"
  
  if [ ! -f "$task_graph" ]; then
    echo "Error: Task graph not found at $task_graph" >&2
    return 1
  fi
  
  if ! command -v yq > /dev/null 2>&1; then
    echo "Error: yq not installed. Install with: brew install yq" >&2
    return 1
  fi
  
  # Get all tasks with status "pending"
  yq eval '.tasks[] | select(.status == "pending") | .id' "$task_graph" | while read -r task_id; do
    # Check if all dependencies are complete
    local deps=$(yq eval ".tasks[] | select(.id == \"$task_id\") | .depends_on[]?" "$task_graph" 2>/dev/null || echo "")
    
    if [ -z "$deps" ]; then
      # No dependencies, ready to run
      echo "$task_id"
    else
      # Check if all dependencies are complete
      local all_complete=true
      for dep in $deps; do
        local dep_status=$(yq eval ".tasks[] | select(.id == \"$dep\") | .status" "$task_graph")
        if [ "$dep_status" != "completed" ]; then
          all_complete=false
          break
        fi
      done
      
      if [ "$all_complete" = true ]; then
        echo "$task_id"
      fi
    fi
  done
}

# Get parallel tasks (tasks that can run together)
get_parallel_tasks() {
  local product_path=$1
  local task_graph="$product_path/.claude/task-graph.yml"
  
  if [ ! -f "$task_graph" ]; then
    echo "Error: Task graph not found" >&2
    return 1
  fi
  
  # Get ready tasks
  local ready_tasks=$(get_ready_tasks "$product_path")
  
  # Group by dependency set
  # Tasks with same dependencies and parallel_ok=true can run together
  echo "$ready_tasks" | while read -r task_id; do
    local parallel_ok=$(yq eval ".tasks[] | select(.id == \"$task_id\") | .parallel_ok // false" "$task_graph")
    if [ "$parallel_ok" = "true" ]; then
      echo "$task_id"
    fi
  done
}

# Update task status
update_task_status() {
  local product_path=$1
  local task_id=$2
  local status=$3
  local task_graph="$product_path/.claude/task-graph.yml"
  
  if [ ! -f "$task_graph" ]; then
    echo "Error: Task graph not found" >&2
    return 1
  fi
  
  # Update task status using yq
  yq eval ".tasks[] |= if .id == \"$task_id\" then .status = \"$status\" else . end" -i "$task_graph"
  
  # Also update timestamp
  if [ "$status" = "in_progress" ]; then
    yq eval ".tasks[] |= if .id == \"$task_id\" then .started_at = \"$(date -Iseconds)\" else . end" -i "$task_graph"
  elif [ "$status" = "completed" ]; then
    yq eval ".tasks[] |= if .id == \"$task_id\" then .completed_at = \"$(date -Iseconds)\" else . end" -i "$task_graph"
  fi
}

# Validate task graph
validate_task_graph() {
  local product_path=$1
  local task_graph="$product_path/.claude/task-graph.yml"
  
  if [ ! -f "$task_graph" ]; then
    echo "Error: Task graph not found" >&2
    return 1
  fi
  
  local errors=0
  
  # Check for circular dependencies (simple check)
  echo "Checking for circular dependencies..."
  
  # Check that all referenced tasks exist
  echo "Checking task references..."
  yq eval '.tasks[].depends_on[]?' "$task_graph" 2>/dev/null | while read -r dep_id; do
    if [ -n "$dep_id" ]; then
      local exists=$(yq eval ".tasks[] | select(.id == \"$dep_id\") | .id" "$task_graph")
      if [ -z "$exists" ]; then
        echo "Error: Task $dep_id referenced but not found" >&2
        errors=$((errors + 1))
      fi
    fi
  done
  
  if [ $errors -eq 0 ]; then
    echo "✅ Task graph is valid"
    return 0
  else
    echo "❌ Task graph has $errors errors"
    return 1
  fi
}

# Get task details
get_task_details() {
  local product_path=$1
  local task_id=$2
  local task_graph="$product_path/.claude/task-graph.yml"
  
  if [ ! -f "$task_graph" ]; then
    echo "Error: Task graph not found" >&2
    return 1
  fi
  
  yq eval ".tasks[] | select(.id == \"$task_id\")" "$task_graph"
}

# List all tasks with their status
list_tasks() {
  local product_path=$1
  local task_graph="$product_path/.claude/task-graph.yml"
  
  if [ ! -f "$task_graph" ]; then
    echo "Error: Task graph not found" >&2
    return 1
  fi
  
  echo "Tasks in $product_path:"
  yq eval '.tasks[] | "\(.id): \(.name) [\(.status)]"' "$task_graph"
}
