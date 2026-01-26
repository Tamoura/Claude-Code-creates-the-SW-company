# System Health Check Command

Run this command to validate the ConnectSW system is properly configured.

## System Validation

### 1. Check Required Tools

```bash
echo "=== Required Tools ==="

# Check jq (JSON processing)
if command -v jq &> /dev/null; then
  echo "✅ jq installed: $(jq --version)"
else
  echo "❌ jq missing - Install: brew install jq (macOS) or apt-get install jq (Linux)"
fi

# Check yq (YAML processing)
if command -v yq &> /dev/null; then
  echo "✅ yq installed: $(yq --version)"
else
  echo "❌ yq missing - Install: brew install yq (macOS) or apt-get install yq (Linux)"
fi

# Check git
if command -v git &> /dev/null; then
  echo "✅ git installed: $(git --version)"
else
  echo "❌ git missing"
fi

# Check gh (GitHub CLI)
if command -v gh &> /dev/null; then
  echo "✅ gh installed: $(gh --version | head -1)"
  if gh auth status &> /dev/null; then
    echo "✅ gh authenticated"
  else
    echo "⚠️  gh not authenticated - Run: gh auth login"
  fi
else
  echo "⚠️  gh missing (optional) - Install: brew install gh"
fi

# Check Node.js
if command -v node &> /dev/null; then
  echo "✅ node installed: $(node --version)"
else
  echo "❌ node missing - Install Node.js 20+"
fi

# Check npm
if command -v npm &> /dev/null; then
  echo "✅ npm installed: $(npm --version)"
else
  echo "❌ npm missing"
fi
```

### 2. Check Directory Structure

```bash
echo ""
echo "=== Directory Structure ==="

# Core directories
dirs=(
  ".claude/agents"
  ".claude/commands"
  ".claude/memory"
  ".claude/memory/agent-experiences"
  ".claude/memory/metrics"
  ".claude/orchestrator"
  ".claude/protocols"
  ".claude/engine"
  ".claude/workflows/templates"
  ".claude/quality-gates"
  ".claude/scripts"
  "products"
  "docs"
)

for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ $dir"
  else
    echo "❌ $dir missing"
  fi
done
```

### 3. Check Core Files

```bash
echo ""
echo "=== Core Files ==="

files=(
  ".claude/CLAUDE.md"
  ".claude/orchestrator/state.yml"
  ".claude/memory/company-knowledge.json"
  ".claude/memory/decision-log.json"
  ".claude/protocols/agent-message.schema.yml"
  ".claude/engine/task-graph.schema.yml"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file missing"
  fi
done
```

### 4. Check Agent Memory Files

```bash
echo ""
echo "=== Agent Memory Files ==="

agents=(
  "product-manager"
  "architect"
  "backend-engineer"
  "frontend-engineer"
  "qa-engineer"
  "devops-engineer"
  "technical-writer"
  "support-engineer"
)

for agent in "${agents[@]}"; do
  file=".claude/memory/agent-experiences/${agent}.json"
  if [ -f "$file" ]; then
    if command -v jq &> /dev/null; then
      tasks=$(jq '.task_history | length' "$file" 2>/dev/null || echo "0")
      patterns=$(jq '.learned_patterns | length' "$file" 2>/dev/null || echo "0")
      echo "✅ $agent (tasks: $tasks, patterns: $patterns)"
    else
      echo "✅ $agent"
    fi
  else
    echo "❌ $agent memory file missing"
  fi
done
```

### 5. Check Scripts Are Executable

```bash
echo ""
echo "=== Script Permissions ==="

scripts=(
  ".claude/scripts/instantiate-task-graph.sh"
  ".claude/scripts/update-agent-memory.sh"
  ".claude/scripts/task-graph-status.sh"
  ".claude/scripts/testing-gate-checklist.sh"
  ".claude/scripts/audit-log.sh"
  ".claude/scripts/generate-dashboard.sh"
  ".claude/quality-gates/executor.sh"
)

needs_chmod=false
for script in "${scripts[@]}"; do
  if [ -f "$script" ]; then
    if [ -x "$script" ]; then
      echo "✅ $script (executable)"
    else
      echo "⚠️  $script (not executable)"
      needs_chmod=true
    fi
  else
    echo "❌ $script missing"
  fi
done

if [ "$needs_chmod" = true ]; then
  echo ""
  echo "To fix permissions, run:"
  echo "  chmod +x .claude/scripts/*.sh .claude/quality-gates/*.sh"
fi
```

### 6. Check Workflow Templates

```bash
echo ""
echo "=== Workflow Templates ==="

templates=(
  "new-product-tasks.yml"
  "new-feature-tasks.yml"
  "bug-fix-tasks.yml"
  "release-tasks.yml"
  "hotfix-tasks.yml"
)

for template in "${templates[@]}"; do
  file=".claude/workflows/templates/$template"
  if [ -f "$file" ]; then
    echo "✅ $template"
  else
    echo "❌ $template missing"
  fi
done
```

### 7. Check Products

```bash
echo ""
echo "=== Products ==="

if [ -d "products" ]; then
  for product_dir in products/*/; do
    if [ -d "$product_dir" ]; then
      product=$(basename "$product_dir")
      
      # Check for key product files
      has_addendum="❌"
      has_prd="❌"
      has_web="❌"
      has_api="❌"
      
      [ -f "${product_dir}.claude/addendum.md" ] && has_addendum="✅"
      [ -f "${product_dir}docs/PRD.md" ] && has_prd="✅"
      [ -d "${product_dir}apps/web" ] && has_web="✅"
      [ -d "${product_dir}apps/api" ] && has_api="✅"
      
      echo "📦 $product"
      echo "   Addendum: $has_addendum | PRD: $has_prd | Web: $has_web | API: $has_api"
    fi
  done
else
  echo "❌ No products directory"
fi
```

### 8. Git Status

```bash
echo ""
echo "=== Git Status ==="

if [ -d ".git" ]; then
  echo "Branch: $(git branch --show-current)"
  echo "Status:"
  git status --short
  
  echo ""
  echo "Worktrees:"
  git worktree list
else
  echo "❌ Not a git repository"
fi
```

### 9. Summary

```bash
echo ""
echo "=== Summary ==="
echo "Run '/orchestrator Status update' to see current work status"
echo "Run '/orchestrator New product: [idea]' to create a new product"
echo ""
echo "If any items show ❌, fix them before proceeding."
```

## Quick Fixes

If you see issues, here are quick fixes:

### Install Missing Tools (macOS)
```bash
brew install jq yq gh
```

### Install Missing Tools (Linux)
```bash
sudo apt-get install jq
# yq: https://github.com/mikefarah/yq#install
# gh: https://github.com/cli/cli#installation
```

### Fix Script Permissions
```bash
chmod +x .claude/scripts/*.sh
chmod +x .claude/quality-gates/*.sh
chmod +x .claude/engine/*.sh 2>/dev/null
chmod +x .claude/dashboard/*.sh 2>/dev/null
```

### Initialize Missing Memory Files
If agent memory files are missing, the `update-agent-memory.sh` script will create them automatically when first used.

## Report Issues

If the system check reveals problems that can't be easily fixed, report to the Orchestrator with details about what's missing or broken.
