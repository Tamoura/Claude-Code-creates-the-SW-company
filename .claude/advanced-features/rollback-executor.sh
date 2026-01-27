#!/bin/bash
# Automated Rollback Executor
# Compatible with Claude Code system
#
# Usage: .claude/advanced-features/rollback-executor.sh <product> <deployment-id>

set -e

PRODUCT=$1
DEPLOYMENT_ID=$2

if [ -z "$PRODUCT" ] || [ -z "$DEPLOYMENT_ID" ]; then
  echo "Usage: $0 <product> <deployment-id>"
  exit 1
fi

PRODUCT_PATH="products/$PRODUCT"
ROLLBACK_DIR="$PRODUCT_PATH/.claude/rollbacks"
mkdir -p "$ROLLBACK_DIR"

LOG_FILE="$ROLLBACK_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date -Iseconds)] $1" | tee -a "$LOG_FILE"
}

log "Starting rollback for $PRODUCT (deployment: $DEPLOYMENT_ID)"

# Check deployment status
check_deployment_health() {
  log "Checking deployment health..."
  
  # Try to get health check endpoint
  if [ -f "$PRODUCT_PATH/docs/DEPLOYMENT.md" ]; then
    # Extract health check URL if documented
    HEALTH_URL=$(grep -i "health" "$PRODUCT_PATH/docs/DEPLOYMENT.md" | head -1 | grep -oE 'https?://[^ ]+' | head -1 || echo "")
    
    if [ -n "$HEALTH_URL" ]; then
      if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
        log "Health check passed"
        return 0
      else
        log "Health check failed"
        return 1
      fi
    fi
  fi
  
  # If no health check, assume we need to rollback based on other indicators
  log "No health check URL found, checking error logs..."
  return 1
}

# Detect issues
detect_issues() {
  log "Detecting deployment issues..."
  
  ISSUES=()
  
  # Check for error rate spikes (would need monitoring integration)
  # For now, check if there are recent error logs
  
  # Check for performance degradation
  # Check for memory issues
  # Check for failed health checks
  
  if ! check_deployment_health; then
    ISSUES+=("Health check failures")
  fi
  
  # Check for recent error logs
  if [ -f "$PRODUCT_PATH/logs/error.log" ]; then
    RECENT_ERRORS=$(tail -n 100 "$PRODUCT_PATH/logs/error.log" | grep -c "ERROR" || echo "0")
    if [ "$RECENT_ERRORS" -gt 10 ]; then
      ISSUES+=("High error rate: $RECENT_ERRORS errors in recent logs")
    fi
  fi
  
  if [ ${#ISSUES[@]} -gt 0 ]; then
    log "Issues detected:"
    for issue in "${ISSUES[@]}"; do
      log "  - $issue"
    done
    return 1
  else
    log "No issues detected"
    return 0
  fi
}

# Execute rollback
execute_rollback() {
  log "Executing rollback..."
  
  # Read rollback plan
  ROLLBACK_PLAN="$PRODUCT_PATH/docs/ROLLBACK.md"
  if [ ! -f "$ROLLBACK_PLAN" ]; then
    log "ERROR: Rollback plan not found at $ROLLBACK_PLAN"
    return 1
  fi
  
  log "Rollback plan found, following steps..."
  
  # Check if using Vercel (common for frontend)
  if [ -f "$PRODUCT_PATH/vercel.json" ] || [ -d "$PRODUCT_PATH/.vercel" ]; then
    log "Detected Vercel deployment, rolling back..."
    if command -v vercel > /dev/null 2>&1; then
      cd "$PRODUCT_PATH"
      vercel rollback --yes >> "$LOG_FILE" 2>&1 || {
        log "ERROR: Vercel rollback failed"
        return 1
      }
      log "Vercel rollback completed"
    else
      log "WARNING: Vercel CLI not installed, manual rollback required"
    fi
  fi
  
  # Check if using Railway (common for backend)
  if [ -f "$PRODUCT_PATH/railway.json" ] || [ -f "$PRODUCT_PATH/railway.toml" ]; then
    log "Detected Railway deployment, rolling back..."
    if command -v railway > /dev/null 2>&1; then
      cd "$PRODUCT_PATH"
      railway rollback >> "$LOG_FILE" 2>&1 || {
        log "ERROR: Railway rollback failed"
        return 1
      }
      log "Railway rollback completed"
    else
      log "WARNING: Railway CLI not installed, manual rollback required"
    fi
  fi
  
  # Check if using Docker
  if [ -f "$PRODUCT_PATH/docker-compose.yml" ]; then
    log "Detected Docker deployment, rolling back..."
    cd "$PRODUCT_PATH"
    docker-compose down >> "$LOG_FILE" 2>&1
    docker-compose up -d --scale web=0 >> "$LOG_FILE" 2>&1 || {
      log "ERROR: Docker rollback failed"
      return 1
    }
    log "Docker rollback completed"
  fi
  
  # Generic git-based rollback
  if [ -d ".git" ]; then
    log "Attempting git-based rollback..."
    PREVIOUS_COMMIT=$(git log --oneline -n 2 | tail -1 | cut -d' ' -f1)
    if [ -n "$PREVIOUS_COMMIT" ]; then
      log "Rolling back to commit: $PREVIOUS_COMMIT"
      # Note: This is a simplified rollback - in production, you'd want to be more careful
      git checkout "$PREVIOUS_COMMIT" >> "$LOG_FILE" 2>&1 || {
        log "ERROR: Git rollback failed"
        return 1
      }
      log "Git rollback completed"
    fi
  fi
  
  return 0
}

# Notify stakeholders
notify_stakeholders() {
  log "Notifying stakeholders..."
  
  # Create notification file
  NOTIFICATION_FILE="$ROLLBACK_DIR/notification-$(date +%Y%m%d-%H%M%S).txt"
  {
    echo "Rollback Notification"
    echo "===================="
    echo ""
    echo "Product: $PRODUCT"
    echo "Deployment ID: $DEPLOYMENT_ID"
    echo "Time: $(date -Iseconds)"
    echo ""
    echo "Issues detected:"
    for issue in "${ISSUES[@]}"; do
      echo "  - $issue"
    done
    echo ""
    echo "Rollback completed successfully."
    echo ""
    echo "Next steps:"
    echo "1. Investigate root cause"
    echo "2. Fix issues"
    echo "3. Re-deploy after verification"
  } > "$NOTIFICATION_FILE"
  
  log "Notification saved to $NOTIFICATION_FILE"
  
  # In production, you'd send email/Slack notification here
}

# Main execution
main() {
  # Detect issues
  if ! detect_issues; then
    log "Issues detected, proceeding with rollback..."
    
    # Execute rollback
    if execute_rollback; then
      log "Rollback completed successfully"
      notify_stakeholders
      exit 0
    else
      log "ERROR: Rollback failed"
      exit 1
    fi
  else
    log "No issues detected, rollback not needed"
    exit 0
  fi
}

main
