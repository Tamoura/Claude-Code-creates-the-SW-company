# Claude Code Utilities

This directory contains utilities and scripts that enhance the Claude Code system for ConnectSW.

## Quick Reference

### Quality Gates

**Location**: `.claude/quality-gates/executor.sh`

Run quality gates for any product:

```bash
# Security gate
.claude/quality-gates/executor.sh security stablecoin-gateway

# Performance gate
.claude/quality-gates/executor.sh performance stablecoin-gateway

# Testing gate
.claude/quality-gates/executor.sh testing stablecoin-gateway

# Production readiness gate
.claude/quality-gates/executor.sh production stablecoin-gateway
```

**Output**: Report saved to `products/[product]/docs/gates/[gate-type]-gate-[timestamp].md`

**Exit Code**: 0 for pass, 1 for fail (compatible with CI/CD)

---

### Risk Calculator

**Location**: `.claude/checkpointing/risk-calculator.ts`

Calculate risk score for tasks to determine if CEO approval is needed.

**TypeScript Usage**:
```typescript
import { calculateTaskRisk } from '.claude/checkpointing/risk-calculator';

const task = {
  id: 'TASK-001',
  affects_staging: true,
  estimated_files_changed: 8,
  assigned_agent: 'backend-engineer'
};

const result = calculateTaskRisk(task);
// { score: 0.25, level: 'low', action: 'auto_approve_with_notification', requiresApproval: false }
```

**CLI Usage**:
```bash
npx tsx .claude/checkpointing/risk-calculator.ts '{"id":"TASK-001","affects_staging":true}'
```

---

### Dashboard Data Aggregator

**Location**: `.claude/dashboard/aggregate-data.sh`

Aggregate metrics for dashboard display.

```bash
# Executive summary
.claude/dashboard/aggregate-data.sh executive

# Agent performance
.claude/dashboard/aggregate-data.sh performance

# Cost tracking
.claude/dashboard/aggregate-data.sh costs

# Products status
.claude/dashboard/aggregate-data.sh products

# Current status
.claude/dashboard/aggregate-data.sh status
```

**Output**: Markdown formatted dashboard data

---

### Pre-commit Hook

**Location**: `.claude/scripts/pre-commit.sh`

Run pre-commit checks before committing code.

```bash
# Check staged files
.claude/scripts/pre-commit.sh --staged-only

# Check all changed files
.claude/scripts/pre-commit.sh
```

**Checks**:
- Linting (if configured)
- Secret scanning (if git-secrets installed)
- Hardcoded credentials detection
- Console.log warnings

**Git Hook Setup**:
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
bash .claude/scripts/pre-commit.sh --staged-only
```

---

### Task Graph Utilities

**Location**: `.claude/engine/task-graph-utils.sh`

Helper functions for task graph operations.

**Usage**:
```bash
# Source the utilities
source .claude/engine/task-graph-utils.sh

# Get ready tasks
get_ready_tasks "products/stablecoin-gateway"

# Get parallel tasks
get_parallel_tasks "products/stablecoin-gateway"

# Update task status
update_task_status "products/stablecoin-gateway" "TASK-01" "completed"

# Validate task graph
validate_task_graph "products/stablecoin-gateway"

# List all tasks
list_tasks "products/stablecoin-gateway"
```

**Requirements**: `yq` (YAML processor)
- Install: `brew install yq` (macOS) or `apt-get install yq` (Linux)

---

## Integration with Claude Code Agents

These utilities are designed to be invoked by Claude Code agents using the Task tool or terminal commands.

### Example: QA Engineer Running Testing Gate

```typescript
// QA Engineer agent can invoke:
Task(
  subagent_type: "general-purpose",
  prompt: `
    Run the testing gate for stablecoin-gateway:
    
    Execute: .claude/quality-gates/executor.sh testing stablecoin-gateway
    
    Report the results back.
  `,
  description: "QA: Run testing gate"
)
```

### Example: Orchestrator Using Risk Calculator

```typescript
// Orchestrator can check risk before checkpoint:
const task = {
  id: "FEATURE-01",
  affects_staging: true,
  estimated_files_changed: 5
};

// Use risk calculator to determine if approval needed
const risk = calculateTaskRisk(task);
if (risk.requiresApproval) {
  // Pause for CEO approval
} else {
  // Auto-approve
}
```

---

## Dependencies

### Required Tools

- **yq**: For YAML processing in task graph utilities
  - Install: `brew install yq` or `apt-get install yq`

- **git-secrets**: For secret scanning (optional but recommended)
  - Install: `brew install git-secrets` or follow [git-secrets installation](https://github.com/awslabs/git-secrets)

- **bc**: For mathematical calculations (usually pre-installed)
  - Used in coverage checks

- **jq**: For JSON processing (optional, improves dashboard output)
  - Install: `brew install jq` or `apt-get install jq`

### Node.js Packages

- **tsx**: For running TypeScript files
  - Install: `npm install -g tsx` or use `npx tsx`

---

## File Structure

```
.claude/
├── quality-gates/
│   └── executor.sh          # Quality gate runner
├── checkpointing/
│   └── risk-calculator.ts   # Risk scoring system
├── dashboard/
│   └── aggregate-data.sh    # Dashboard data aggregator
├── scripts/
│   └── pre-commit.sh         # Pre-commit hook script
└── engine/
    └── task-graph-utils.sh  # Task graph helper functions
```

---

## CI/CD Integration

### GitHub Actions

These utilities are integrated into GitHub Actions workflows:

- **Dependabot**: `.github/dependabot.yml` - Automated dependency updates
- **Coverage Check**: `.github/workflows/test.yml` - Enforces 80% coverage minimum
- **Quality Gates**: Can be added to CI workflows

### Example CI Workflow Addition

```yaml
- name: Run Security Gate
  run: .claude/quality-gates/executor.sh security ${{ env.PRODUCT_NAME }}
  
- name: Run Testing Gate
  run: .claude/quality-gates/executor.sh testing ${{ env.PRODUCT_NAME }}
```

---

## Troubleshooting

### "yq: command not found"
Install yq: `brew install yq` (macOS) or `apt-get install yq` (Linux)

### "git-secrets: command not found"
Install git-secrets or the script will skip secret scanning with a warning.

### "bc: command not found"
Install bc: `brew install bc` (macOS) or `apt-get install bc` (Linux)

### Permission Denied
Make scripts executable:
```bash
chmod +x .claude/quality-gates/executor.sh
chmod +x .claude/dashboard/aggregate-data.sh
chmod +x .claude/scripts/pre-commit.sh
chmod +x .claude/engine/task-graph-utils.sh
```

---

## Contributing

When adding new utilities:

1. Place in appropriate `.claude/` subdirectory
2. Make executable: `chmod +x script.sh`
3. Add usage examples to this README
4. Ensure compatibility with Claude Code Task tool
5. Test with actual agent invocations

---

**See Also**:
- [Enhancements Documentation](../docs/ENHANCEMENTS.md)
- [Quick Wins Implementation](../docs/QUICK-WINS-IMPLEMENTATION.md)
