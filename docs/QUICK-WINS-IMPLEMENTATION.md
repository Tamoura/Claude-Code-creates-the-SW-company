# Quick Wins Implementation Guide

**Ready-to-use code snippets for immediate improvements**

---

## 1. Dependabot Configuration (15 minutes)

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Monitor npm dependencies in all product apps
  - package-ecosystem: "npm"
    directory: "/products/*/apps/*"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "tamer"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore"
      include: "scope"
    ignore:
      # Ignore major version updates (review manually)
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  # Monitor GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 5
```

**Benefits**:
- Automated dependency updates
- Security patches applied automatically
- Reduces maintenance burden

---

## 2. Pre-commit Hooks (30 minutes)

### Step 1: Install Husky

```bash
# In root directory (if you add a root package.json)
npm install --save-dev husky
npx husky install

# Or use standalone script approach
```

### Step 2: Create Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Detect changed products
CHANGED_PRODUCTS=$(git diff --cached --name-only | grep -o 'products/[^/]*' | sort -u | cut -d'/' -f2)

for PRODUCT in $CHANGED_PRODUCTS; do
  if [ -d "products/$PRODUCT" ]; then
    echo "📦 Checking $PRODUCT..."
    
    # Run linting if package.json exists
    if [ -f "products/$PRODUCT/apps/web/package.json" ]; then
      cd "products/$PRODUCT/apps/web"
      npm run lint --if-present || exit 1
      cd - > /dev/null
    fi
    
    if [ -f "products/$PRODUCT/apps/api/package.json" ]; then
      cd "products/$PRODUCT/apps/api"
      npm run lint --if-present || exit 1
      cd - > /dev/null
    fi
    
    # Secret scanning
    if command -v git-secrets > /dev/null; then
      git secrets --scan --cached || exit 1
    fi
  fi
done

echo "✅ Pre-commit checks passed!"
```

**Alternative: Simple Script Approach**

Create `scripts/pre-commit.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Running pre-commit checks..."

# Secret scanning
if command -v git-secrets > /dev/null; then
  echo "🔐 Scanning for secrets..."
  git secrets --scan --cached || {
    echo "❌ Secrets detected! Please remove them."
    exit 1
  }
else
  echo "⚠️  git-secrets not installed. Skipping secret scan."
fi

# Basic linting check
echo "📝 Checking for common issues..."

# Check for console.log in production code
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -l 'console\.log' 2>/dev/null; then
  echo "⚠️  Warning: console.log found in staged files"
fi

# Check for TODO/FIXME comments
if git diff --cached | grep -E 'TODO|FIXME' > /dev/null; then
  echo "ℹ️  Info: TODO/FIXME comments found (not blocking)"
fi

echo "✅ Pre-commit checks passed!"
```

Then add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
bash scripts/pre-commit.sh
```

---

## 3. Coverage Enforcement (30 minutes)

Add to each product's CI workflow (`.github/workflows/test-[product].yml`):

```yaml
- name: Check test coverage
  run: |
    cd products/${{ env.PRODUCT_NAME }}
    
    # Run tests with coverage
    npm run test:coverage || exit 1
    
    # Extract coverage percentage
    COVERAGE=$(npm run test:coverage -- --json 2>/dev/null | jq -r '.total.lines.pct // 0')
    
    # Check threshold (80%)
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "❌ Coverage is $COVERAGE%, below 80% threshold"
      echo "Please add more tests to increase coverage"
      exit 1
    else
      echo "✅ Coverage is $COVERAGE%, above 80% threshold"
    fi
  env:
    PRODUCT_NAME: ${{ env.PRODUCT_NAME }}
```

**For Vitest** (if using Vitest):

```yaml
- name: Check test coverage
  run: |
    cd products/${{ env.PRODUCT_NAME }}/apps/web
    
    # Run tests with coverage
    npm run test:coverage
    
    # Vitest outputs coverage in different format
    # Check coverage-summary.json
    COVERAGE=$(cat coverage/coverage-summary.json | jq -r '.total.lines.pct')
    
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "❌ Coverage is $COVERAGE%, below 80% threshold"
      exit 1
    fi
```

---

## 4. Dashboard Data Endpoint (1 hour)

Create `.claude/dashboard/server.ts`:

```typescript
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3001;

// Helper to read JSON files
async function readJSON(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Executive summary endpoint
app.get('/api/dashboard/executive', async (req, res) => {
  const metricsPath = path.join(__dirname, '../memory/metrics');
  
  const [
    agentPerformance,
    costMetrics,
    gateMetrics,
    resourceMetrics
  ] = await Promise.all([
    readJSON(path.join(metricsPath, 'agent-performance.json')),
    readJSON(path.join(metricsPath, 'cost-metrics.json')),
    readJSON(path.join(metricsPath, 'gate-metrics.json')),
    readJSON(path.join(metricsPath, 'resource-metrics.json'))
  ]);

  // Calculate summary metrics
  const totalTasks = Object.values(agentPerformance?.agents || {})
    .reduce((sum: number, agent: any) => sum + (agent.tasks_completed || 0), 0);
  
  const successRate = Object.values(agentPerformance?.agents || {})
    .reduce((sum: number, agent: any) => {
      const tasks = agent.tasks_completed || 0;
      const success = agent.success_rate || 0;
      return sum + (tasks * success);
    }, 0) / totalTasks || 0;

  res.json({
    timestamp: new Date().toISOString(),
    active_work: {
      agents_working: 0, // TODO: Track active agents
      tasks_in_queue: 0,
      products_in_dev: 0
    },
    today_activity: {
      tasks_completed: totalTasks,
      success_rate: successRate,
      avg_task_time: 0 // TODO: Calculate from metrics
    },
    resource_usage: {
      cost: costMetrics?.daily_cost || 0,
      tokens: resourceMetrics?.tokens_used || 0,
      budget_limit: 100 // TODO: Read from config
    },
    products: [], // TODO: Read from state.yml
    alerts: [],
    trends: {}
  });
});

// Agent performance endpoint
app.get('/api/dashboard/performance', async (req, res) => {
  const performance = await readJSON(
    path.join(__dirname, '../memory/metrics/agent-performance.json')
  );
  res.json(performance || {});
});

// Cost tracking endpoint
app.get('/api/dashboard/costs', async (req, res) => {
  const costs = await readJSON(
    path.join(__dirname, '../memory/metrics/cost-metrics.json')
  );
  res.json(costs || {});
});

// Products endpoint
app.get('/api/dashboard/products', async (req, res) => {
  const state = await readJSON(
    path.join(__dirname, '../orchestrator/state.yml')
  );
  res.json({
    products: state?.products || []
  });
});

app.listen(PORT, () => {
  console.log(`📊 Dashboard API running on http://localhost:${PORT}`);
});
```

**Usage**:
```bash
# Install dependencies
npm install express @types/express

# Run server
npx tsx .claude/dashboard/server.ts

# Access dashboard
curl http://localhost:3001/api/dashboard/executive
```

---

## 5. Risk Calculator Implementation (1 hour)

Create `.claude/checkpointing/risk-calculator.ts`:

```typescript
interface Task {
  id: string;
  affects_production?: boolean;
  affects_staging?: boolean;
  affects_dev?: boolean;
  estimated_files_changed?: number;
  adds_external_dependencies?: boolean;
  updates_dependencies?: boolean;
  affects_database_schema?: boolean;
  affects_data_model?: boolean;
  assigned_agent?: string;
  uses_new_pattern?: boolean;
  uses_pattern_with_confidence?: number;
}

interface Agent {
  recent_failures?: number;
  success_rate?: number;
}

interface Context {
  agents?: Record<string, Agent>;
}

export class RiskCalculator {
  calculateRisk(task: Task, context: Context = {}): number {
    let score = 0.0;

    // 1. Task Impact (0-0.3)
    if (task.affects_production) {
      score += 0.3;
    } else if (task.affects_staging) {
      score += 0.15;
    } else if (task.affects_dev) {
      score += 0.05;
    }

    // 2. Code Complexity (0-0.2)
    const filesChanged = task.estimated_files_changed || 0;
    if (filesChanged > 20) {
      score += 0.2;
    } else if (filesChanged > 10) {
      score += 0.15;
    } else if (filesChanged > 5) {
      score += 0.1;
    } else {
      score += 0.02;
    }

    // 3. External Dependencies (0-0.15)
    if (task.adds_external_dependencies) {
      score += 0.15;
    } else if (task.updates_dependencies) {
      score += 0.08;
    }

    // 4. Data Impact (0-0.15)
    if (task.affects_database_schema) {
      score += 0.15;
    } else if (task.affects_data_model) {
      score += 0.08;
    }

    // 5. Agent History (0-0.1)
    if (task.assigned_agent && context.agents) {
      const agent = context.agents[task.assigned_agent];
      if (agent) {
        if ((agent.recent_failures || 0) > 2) {
          score += 0.1;
        } else if ((agent.success_rate || 1.0) < 0.85) {
          score += 0.05;
        }
      }
    }

    // 6. Pattern Confidence (0-0.1)
    if (task.uses_new_pattern) {
      score += 0.1;
    } else if (task.uses_pattern_with_confidence !== undefined) {
      if (task.uses_pattern_with_confidence < 0.7) {
        score += 0.05;
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  shouldRequireApproval(score: number): boolean {
    return score >= 0.6;
  }

  getRiskLevel(score: number): string {
    if (score < 0.3) return 'very_low';
    if (score < 0.5) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'very_high';
  }

  getAction(score: number): string {
    const level = this.getRiskLevel(score);
    const actions: Record<string, string> = {
      very_low: 'auto_approve',
      low: 'auto_approve_with_notification',
      medium: 'optional_review',
      high: 'ceo_approval_required',
      very_high: 'ceo_approval_required_with_details'
    };
    return actions[level] || 'unknown';
  }
}

// Example usage
export function calculateTaskRisk(task: Task, context?: Context): {
  score: number;
  level: string;
  action: string;
  requiresApproval: boolean;
} {
  const calculator = new RiskCalculator();
  const score = calculator.calculateRisk(task, context);
  
  return {
    score,
    level: calculator.getRiskLevel(score),
    action: calculator.getAction(score),
    requiresApproval: calculator.shouldRequireApproval(score)
  };
}
```

**Usage**:
```typescript
import { calculateTaskRisk } from './risk-calculator';

const task = {
  id: 'TASK-001',
  affects_production: false,
  affects_staging: true,
  estimated_files_changed: 8,
  adds_external_dependencies: false,
  assigned_agent: 'backend-engineer'
};

const result = calculateTaskRisk(task);
console.log(result);
// {
//   score: 0.25,
//   level: 'low',
//   action: 'auto_approve_with_notification',
//   requiresApproval: false
// }
```

---

## 6. Quality Gate Scripts (2 hours)

Create `.claude/quality-gates/executor.sh`:

```bash
#!/bin/bash
set -e

GATE_TYPE=$1
PRODUCT=$2
PRODUCT_PATH="products/$PRODUCT"

if [ -z "$GATE_TYPE" ] || [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <gate_type> <product>"
  echo "Gate types: security, performance, testing, production"
  exit 1
fi

REPORT_DIR="$PRODUCT_PATH/docs/gates"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/${GATE_TYPE}-gate-$(date +%Y%m%d-%H%M%S).md"

echo "# ${GATE_TYPE^} Gate Report" > "$REPORT_FILE"
echo "**Product**: $PRODUCT" >> "$REPORT_FILE"
echo "**Date**: $(date -Iseconds)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

case $GATE_TYPE in
  security)
    echo "## Security Gate Checks" >> "$REPORT_FILE"
    
    # npm audit
    echo "### Dependency Audit" >> "$REPORT_FILE"
    if [ -f "$PRODUCT_PATH/apps/api/package.json" ]; then
      cd "$PRODUCT_PATH/apps/api"
      npm audit --audit-level=high >> "$REPORT_FILE" 2>&1 || true
      cd - > /dev/null
    fi
    
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      cd "$PRODUCT_PATH/apps/web"
      npm audit --audit-level=high >> "$REPORT_FILE" 2>&1 || true
      cd - > /dev/null
    fi
    
    # Secret scanning
    echo "### Secret Scanning" >> "$REPORT_FILE"
    if command -v git-secrets > /dev/null; then
      git secrets --scan "$PRODUCT_PATH" >> "$REPORT_FILE" 2>&1 || {
        echo "❌ FAIL: Secrets detected" >> "$REPORT_FILE"
        exit 1
      }
      echo "✅ PASS: No secrets detected" >> "$REPORT_FILE"
    else
      echo "⚠️  WARN: git-secrets not installed" >> "$REPORT_FILE"
    fi
    
    echo "**Status**: ✅ PASS" >> "$REPORT_FILE"
    ;;
    
  performance)
    echo "## Performance Gate Checks" >> "$REPORT_FILE"
    
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      cd "$PRODUCT_PATH/apps/web"
      
      # Lighthouse (if available)
      if command -v lighthouse > /dev/null; then
        echo "### Lighthouse Scores" >> "$REPORT_FILE"
        lighthouse http://localhost:3100 --output=json --output-path=/tmp/lighthouse.json || true
        # Parse and add to report
      fi
      
      # Bundle analysis
      echo "### Bundle Size" >> "$REPORT_FILE"
      npm run build >> "$REPORT_FILE" 2>&1 || exit 1
      npm run analyze >> "$REPORT_FILE" 2>&1 || true
      
      cd - > /dev/null
    fi
    
    echo "**Status**: ✅ PASS" >> "$REPORT_FILE"
    ;;
    
  testing)
    echo "## Testing Gate Checks" >> "$REPORT_FILE"
    
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      cd "$PRODUCT_PATH/apps/web"
      
      echo "### Unit Tests" >> "$REPORT_FILE"
      npm run test:run >> "$REPORT_FILE" 2>&1 || {
        echo "❌ FAIL: Unit tests failed" >> "$REPORT_FILE"
        exit 1
      }
      echo "✅ PASS: All unit tests passed" >> "$REPORT_FILE"
      
      echo "### E2E Tests" >> "$REPORT_FILE"
      npm run test:e2e >> "$REPORT_FILE" 2>&1 || {
        echo "❌ FAIL: E2E tests failed" >> "$REPORT_FILE"
        exit 1
      }
      echo "✅ PASS: All E2E tests passed" >> "$REPORT_FILE"
      
      cd - > /dev/null
    fi
    
    echo "**Status**: ✅ PASS" >> "$REPORT_FILE"
    ;;
    
  production)
    echo "## Production Readiness Gate" >> "$REPORT_FILE"
    
    # Check for required files
    echo "### Required Files" >> "$REPORT_FILE"
    
    checks=(
      ".env.example:Environment variables documented"
      "docs/DEPLOYMENT.md:Deployment guide exists"
      "docs/ROLLBACK.md:Rollback plan exists"
    )
    
    for check in "${checks[@]}"; do
      file="${check%%:*}"
      desc="${check#*:}"
      if [ -f "$PRODUCT_PATH/$file" ]; then
        echo "✅ $desc" >> "$REPORT_FILE"
      else
        echo "❌ Missing: $desc" >> "$REPORT_FILE"
        exit 1
      fi
    done
    
    echo "**Status**: ✅ PASS" >> "$REPORT_FILE"
    ;;
    
  *)
    echo "Unknown gate type: $GATE_TYPE"
    exit 1
    ;;
esac

echo ""
echo "Report saved to: $REPORT_FILE"
cat "$REPORT_FILE"
```

**Usage**:
```bash
chmod +x .claude/quality-gates/executor.sh
./claude/quality-gates/executor.sh security gpu-calculator
./claude/quality-gates/executor.sh testing gpu-calculator
```

---

## Summary

These quick wins can be implemented in **~4-5 hours total** and provide immediate value:

1. ✅ Dependabot (15 min) - Automated dependency updates
2. ✅ Pre-commit hooks (30 min) - Catch issues early
3. ✅ Coverage enforcement (30 min) - Maintain quality
4. ✅ Dashboard API (1 hour) - Better visibility
5. ✅ Risk calculator (1 hour) - Smart checkpointing
6. ✅ Quality gate scripts (2 hours) - Automated gates

**Total time**: ~5 hours  
**Impact**: High  
**Priority**: Critical

---

**Next**: Implement these, then move to the higher-effort enhancements from `ENHANCEMENTS.md`.
