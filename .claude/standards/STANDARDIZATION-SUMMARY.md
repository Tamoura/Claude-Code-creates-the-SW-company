# ConnectSW Standardization Summary

**Last Updated**: 2026-01-29

This document summarizes the standardization improvements made to the task graph, quality gates, and orchestrator infrastructure.

---

## 1. Task Graph Schema Enhancements

### ID Pattern Support

**Updated**: `.claude/engine/task-graph.schema.yml`

**Changes**:
- Extended ID pattern from `^[A-Z]+-[0-9]+$` to `^[A-Z]+(-[A-Z]+)*-[0-9A-Z]+$`
- Now supports: `CHECKPOINT-001`, `DESIGN-REVIEW-01`, `RELEASE-PREP-A`, etc.

**Example**:
```yaml
tasks:
  - id: "PRD-01"              # ✅ Supported (before)
  - id: "CHECKPOINT-ARCH"     # ✅ Supported (new)
  - id: "RELEASE-PREP-01"     # ✅ Supported (new)
  - id: "DESIGN-REVIEW-A"     # ✅ Supported (new)
```

### Agent Enum Expansion

**Added agent types**:
- `orchestrator` - For meta-tasks (checkpoints, coordination)
- `product-strategist` - For high-level product strategy
- `security-engineer` - For security-specific tasks

**Full enum**:
```yaml
agent:
  type: enum
  values:
    - orchestrator
    - product-manager
    - product-strategist
    - architect
    - backend-engineer
    - frontend-engineer
    - qa-engineer
    - security-engineer
    - devops-engineer
    - technical-writer
    - support-engineer
```

---

## 2. Placeholder Validation

### Instantiate Script Enhancement

**Updated**: `.claude/scripts/instantiate-task-graph.sh`

**Added validation step**:
```bash
# Validate no placeholders remain
if echo "$OUTPUT" | grep -q '{[A-Z_]*}'; then
  echo "❌ Error: Unsubstituted placeholders found in task graph:"
  echo ""
  echo "$OUTPUT" | grep -o '{[A-Z_]*}' | sort -u
  echo ""
  echo "Please provide values for all placeholders via PARAMS argument."
  exit 1
fi
```

**Benefits**:
- ✅ Catches missing parameter substitutions before file creation
- ✅ Clear error messages showing which placeholders remain
- ✅ Prevents broken task graphs from being generated

**Example error**:
```
❌ Error: Unsubstituted placeholders found in task graph:

{FEATURE_NAME}
{VERSION}

Please provide values for all placeholders via PARAMS argument.
```

---

## 3. Normalized Documentation Paths

### Quality Reports Directory

**Standardized path**: `products/{product}/docs/quality-reports/`

**Previous inconsistencies**:
- ❌ `docs/gates/`
- ❌ `docs/test-reports/`
- ❌ `docs/quality-gates/`

**Now standardized**:
- ✅ `docs/quality-reports/` (all quality gate reports)

**Updated files**:
- `.claude/quality-gates/executor.sh`

**Example structure**:
```
products/stablecoin-gateway/
└── docs/
    ├── quality-reports/           # ✅ Standardized
    │   ├── security-gate-20260129-1430.md
    │   ├── testing-gate-20260129-1500.md
    │   └── production-gate-20260129-1600.md
    ├── api-contract.yml           # API spec (standardized)
    └── API.md                     # Human-readable docs
```

---

## 4. Aligned Testing Scripts

### Standard npm Scripts

**Updated**: `.claude/quality-gates/executor.sh`

**Testing gate now uses**:
- `npm test` - All unit tests (standard)
- `npm run test:smoke` - Smoke tests (optional)
- `npm run test:e2e` - End-to-end tests (standard)
- `npm run test:all` - Combined test suite (optional)

**Previous inconsistencies**:
- ❌ `npm run test:run`
- ❌ `npm run test:coverage` (moved to separate check)

**Required package.json scripts**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:smoke": "playwright test tests/smoke.spec.ts",
    "test:e2e": "playwright test",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

**Benefits**:
- ✅ Consistent across all products
- ✅ Matches TESTING-STANDARDS.md documentation
- ✅ Industry-standard naming conventions
- ✅ Easy for new developers to understand

---

## 5. API Specification Filename Standard

### Standardized Filename

**Standard**: `api-contract.yml`

**Documentation**: `.claude/standards/API-SPECIFICATIONS.md`

**Rationale**:
- "Contract" emphasizes API as binding agreement
- Consistent with OpenAPI best practices
- Easier for tooling to locate

**Migration path for existing products**:
```bash
# If using different name
mv docs/api-schema.yml docs/api-contract.yml

# Create temporary symlink for compatibility
ln -s api-contract.yml api-schema.yml
```

**Task graph integration**:
```yaml
- id: "ARCH-01"
  name: "Design System Architecture"
  produces:
    - name: "API Contract"
      type: "file"
      path: "products/{product}/docs/api-contract.yml"  # ✅ Standard
```

---

## 6. AgentMessage JSON Format

### Unified Message Format

**Standard format**: Defined in `.claude/protocols/message-router.ts`

**Updated**: `.claude/commands/execute-task.md`

**AgentMessage structure**:
```typescript
interface AgentMessage {
  metadata: {
    from: string;                 // Agent name
    to: string;                   // Recipient (usually "orchestrator")
    timestamp: string;            // ISO-8601
    message_type: 'task_complete' | 'task_failed' | 'checkpoint_ready' | ...;
    product?: string;
    task_id?: string;
  };
  payload: {
    status: 'success' | 'failure' | 'blocked' | 'in_progress';
    summary: string;
    artifacts?: Array<{
      path: string;
      type: 'file' | 'pr' | 'branch' | 'document';
      description: string;
    }>;
    metrics?: {
      time_spent_minutes?: number;
      files_changed?: number;
      tests_added?: number;
      tests_passing?: boolean;
      coverage_percent?: number;
    };
  };
}
```

**Usage**:
```bash
npx tsx .claude/protocols/message-router.ts '{
  "metadata": {
    "from": "backend-engineer",
    "to": "orchestrator",
    "timestamp": "2026-01-29T14:30:00Z",
    "message_type": "task_complete",
    "product": "stablecoin-gateway",
    "task_id": "BACKEND-01"
  },
  "payload": {
    "status": "success",
    "summary": "API endpoints implemented with tests",
    "artifacts": [{"path": "apps/api/src/routes.ts", "type": "file", "description": "API routes"}],
    "metrics": {"time_spent_minutes": 45, "tests_passing": true}
  }
}'
```

**Benefits**:
- ✅ Automatic task graph updates
- ✅ Automatic agent memory updates
- ✅ Structured data for analytics
- ✅ Easy orchestrator integration
- ✅ Standardized communication protocol

---

## Summary of Changes

| Area | Before | After | Impact |
|------|--------|-------|--------|
| **Task IDs** | `PRD-01` only | `CHECKPOINT-01`, `DESIGN-REVIEW-A`, etc. | More expressive task naming |
| **Agent types** | 8 types | 11 types (+ orchestrator, security, strategist) | Better task assignment |
| **Placeholder validation** | None | Pre-flight check | Prevents broken graphs |
| **Quality reports** | `docs/gates/` | `docs/quality-reports/` | Consistent structure |
| **Test commands** | `test:run`, `test:coverage` | `test`, `test:e2e`, `test:smoke` | Industry standard |
| **API specs** | Mixed (schema/contract/spec) | `api-contract.yml` | Single standard |
| **Agent messages** | Free-form | AgentMessage JSON | Structured automation |

---

## Migration Checklist

For existing products:

- [ ] Update task graphs to use new ID patterns (optional, backward compatible)
- [ ] Move quality reports to `docs/quality-reports/`
- [ ] Rename API specs to `api-contract.yml`
- [ ] Update package.json scripts to use standard test commands
- [ ] Adopt AgentMessage format for task completion reports

---

## Validation

To validate compliance:

```bash
# Check task graph schema
yq eval '.tasks[].id' products/*/task-graph.yml | grep -v -E '^[A-Z]+(-[A-Z]+)*-[0-9A-Z]+$'

# Check API spec naming
find products/ -name "api-*.yml" | grep -v "api-contract.yml"

# Check test scripts
for pkg in products/*/apps/*/package.json; do
  if ! jq -e '.scripts.test' "$pkg" > /dev/null; then
    echo "Missing 'test' script: $pkg"
  fi
done
```

---

## Documentation Updates

All related documentation has been updated:

- ✅ `.claude/engine/task-graph.schema.yml` - Schema with new patterns
- ✅ `.claude/scripts/instantiate-task-graph.sh` - Placeholder validation
- ✅ `.claude/quality-gates/executor.sh` - Standard paths and commands
- ✅ `.claude/commands/execute-task.md` - AgentMessage format
- ✅ `.claude/standards/API-SPECIFICATIONS.md` - API naming standard
- ✅ `.claude/standards/TESTING-STANDARDS.md` - Already compliant

---

## Next Steps

1. **Gradual migration**: Update products as they're worked on (not all at once)
2. **Template updates**: Update all task graph templates to use new patterns
3. **Tooling**: Consider creating validation scripts for CI/CD
4. **Training**: Update agent instructions to reference these standards

---

**Status**: ✅ All standards documented and implemented
**Backward compatibility**: ✅ Maintained (old patterns still work)
**Breaking changes**: ❌ None
