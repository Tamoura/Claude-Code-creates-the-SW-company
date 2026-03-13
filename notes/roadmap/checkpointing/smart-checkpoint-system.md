# Smart Checkpointing System

**Phase 3 Enhancement**: Risk-based CEO approval instead of fixed checkpoints.

## Purpose

Reduce unnecessary CEO interruptions while ensuring CEO reviews high-risk changes.

**Problem with Fixed Checkpoints** (Phase 1-2):
- Every PRD requires CEO approval (even simple ones)
- Every architecture requires approval (even standard patterns)
- CEO interrupted 6-8 times per product
- Slows down simple, low-risk work

**Solution - Smart Checkpointing**:
- Calculate risk score for each task
- Auto-approve low-risk tasks
- Require CEO approval only for high-risk tasks
- Reduce CEO interruptions by 60-70%

## Risk Calculation Algorithm

```python
def calculate_risk_score(task, context) -> float:
    """
    Calculate risk score from 0.0 (no risk) to 1.0 (maximum risk).
    Threshold: 0.6 requires CEO approval.
    """

    score = 0.0

    # 1. Task Impact (0-0.3)
    if task.affects_production:
        score += 0.3
    elif task.affects_staging:
        score += 0.15
    elif task.affects_dev:
        score += 0.05

    # 2. Code Complexity (0-0.2)
    files_changed = task.estimated_files_changed
    if files_changed > 20:
        score += 0.2
    elif files_changed > 10:
        score += 0.15
    elif files_changed > 5:
        score += 0.1
    else:
        score += 0.02

    # 3. External Dependencies (0-0.15)
    if task.adds_external_dependencies:
        score += 0.15
    elif task.updates_dependencies:
        score += 0.08

    # 4. Data Impact (0-0.15)
    if task.affects_database_schema:
        score += 0.15
    elif task.affects_data_model:
        score += 0.08

    # 5. Agent History (0-0.1)
    agent = task.assigned_agent
    if agent.recent_failures > 2:
        score += 0.1
    elif agent.success_rate < 0.85:
        score += 0.05

    # 6. Pattern Confidence (0-0.1)
    if task.uses_new_pattern:
        score += 0.1
    elif task.uses_pattern_with_confidence < 0.7:
        score += 0.05

    return min(score, 1.0)  # Cap at 1.0
```

## Risk Levels

```yaml
risk_levels:
  very_low:
    score: 0.0 - 0.3
    action: auto_approve
    examples:
      - "Fix typo in documentation"
      - "Update test data"
      - "Add simple utility function"

  low:
    score: 0.3 - 0.5
    action: auto_approve_with_notification
    examples:
      - "Add new page with standard pattern"
      - "Implement CRUD endpoint"
      - "Update styling"

  medium:
    score: 0.5 - 0.6
    action: optional_review
    examples:
      - "Add new feature with known pattern"
      - "Update dependency version"
      - "Refactor component"
    notification: "CEO can review if desired, but not required"

  high:
    score: 0.6 - 0.8
    action: ceo_approval_required
    examples:
      - "New architecture pattern"
      - "Database schema change"
      - "Add external service integration"

  very_high:
    score: 0.8 - 1.0
    action: ceo_approval_required_with_details
    examples:
      - "Production database migration"
      - "Change authentication system"
      - "Multi-service refactor"
```

## Decision Matrix

```
┌─────────────────┬──────────────────────────────────────────┐
│ Risk Score      │ Action                                   │
├─────────────────┼──────────────────────────────────────────┤
│ 0.0 - 0.3       │ ✅ Auto-approve                          │
│ (Very Low)      │ No CEO notification                      │
├─────────────────┼──────────────────────────────────────────┤
│ 0.3 - 0.5       │ ✅ Auto-approve + Notify                 │
│ (Low)           │ CEO gets summary in daily digest         │
├─────────────────┼──────────────────────────────────────────┤
│ 0.5 - 0.6       │ 🔔 Optional Review                       │
│ (Medium)        │ CEO notified, can review if desired      │
│                 │ Auto-approves after 2 hours if no action │
├─────────────────┼──────────────────────────────────────────┤
│ 0.6 - 0.8       │ ⏸️ CEO Approval Required                 │
│ (High)          │ Pause and wait for explicit approval     │
├─────────────────┼──────────────────────────────────────────┤
│ 0.8 - 1.0       │ ⚠️ CEO Approval + Detailed Review        │
│ (Very High)     │ Pause, request detailed review & sign-off│
└─────────────────┴──────────────────────────────────────────┘
```

## Examples

### Example 1: Simple Documentation Update

```yaml
task:
  id: "DOCS-12"
  name: "Fix typo in README"
  type: "documentation"
  files_changed: 1
  affects_production: false
  uses_new_pattern: false
  agent: "technical-writer"
  agent_success_rate: 1.0

risk_calculation:
  task_impact: 0.05        # Dev only
  code_complexity: 0.02    # 1 file
  external_deps: 0         # None
  data_impact: 0           # None
  agent_history: 0         # Perfect record
  pattern_confidence: 0    # Standard task

  total: 0.07

decision: ✅ AUTO-APPROVE (very low risk)
ceo_notification: None
```

### Example 2: Standard CRUD Feature

```yaml
task:
  id: "BACKEND-42"
  name: "Add user profile CRUD endpoints"
  type: "feature"
  files_changed: 6
  affects_production: false
  uses_new_pattern: false  # Standard CRUD
  agent: "backend-engineer"
  agent_success_rate: 0.95

risk_calculation:
  task_impact: 0.05        # Dev only
  code_complexity: 0.1     # 6 files
  external_deps: 0         # None
  data_impact: 0.08        # Data model changes
  agent_history: 0         # Good record
  pattern_confidence: 0    # Well-known pattern

  total: 0.23

decision: ✅ AUTO-APPROVE (very low risk)
ceo_notification: Daily digest
```

### Example 3: New Architecture Pattern

```yaml
task:
  id: "ARCH-08"
  name: "Design event-driven architecture"
  type: "architecture"
  files_changed: 15
  affects_production: false
  uses_new_pattern: true   # New for this company
  agent: "architect"
  agent_success_rate: 0.88

risk_calculation:
  task_impact: 0.05        # Dev only
  code_complexity: 0.15    # 15 files
  external_deps: 0.15      # Message queue dependency
  data_impact: 0.08        # New data patterns
  agent_history: 0.05      # Some revisions needed before
  pattern_confidence: 0.1  # New pattern

  total: 0.58

decision: 🔔 OPTIONAL REVIEW (medium risk)
ceo_notification: Immediate
message: "New event-driven architecture proposed. Review recommended but not blocking. Auto-approves in 2 hours if no action."
```

### Example 4: Production Database Migration

```yaml
task:
  id: "BACKEND-88"
  name: "Migrate users table to add roles column"
  type: "database-migration"
  files_changed: 8
  affects_production: true    # ⚠️ Production impact
  uses_new_pattern: false
  agent: "backend-engineer"
  agent_success_rate: 0.95

risk_calculation:
  task_impact: 0.3         # ⚠️ Production
  code_complexity: 0.1     # 8 files
  external_deps: 0         # None
  data_impact: 0.15        # ⚠️ Schema change
  agent_history: 0         # Good record
  pattern_confidence: 0    # Standard migration

  total: 0.55

decision: ⏸️ CEO APPROVAL REQUIRED (high risk)
reason: "Production database schema change"
ceo_notification: Immediate
message: "Database migration ready for production. Affects users table. Review migration script and rollback plan before approval."
```

### Example 5: Authentication System Change

```yaml
task:
  id: "ARCH-15"
  name: "Replace JWT with session-based auth"
  type: "architecture-change"
  files_changed: 35
  affects_production: true
  uses_new_pattern: true
  agent: "architect"
  agent_success_rate: 0.88

risk_calculation:
  task_impact: 0.3         # ⚠️ Production
  code_complexity: 0.2     # ⚠️ 35 files
  external_deps: 0.15      # Redis dependency
  data_impact: 0.15        # Session storage
  agent_history: 0.05      # Some revisions
  pattern_confidence: 0.1  # New pattern

  total: 0.95

decision: ⚠️ CEO APPROVAL + DETAILED REVIEW (very high risk)
reason: "Critical system change affecting authentication"
ceo_notification: Immediate with alert
message: "CRITICAL: Authentication system redesign. Affects all users. Requires detailed review of:
- Security implications
- Migration strategy
- Rollback plan
- Testing strategy
Please review architecture doc and approve/reject."
```

## Integration with Task Graphs

### Task Definition with Risk Hints

```yaml
tasks:
  - id: "DOCS-12"
    name: "Update README"
    agent: "technical-writer"
    # Risk hints (orchestrator uses these)
    risk_hints:
      affects_production: false
      estimated_files_changed: 1
      adds_dependencies: false
      affects_database: false
      uses_new_pattern: false

    # Traditional checkpoint field now optional
    checkpoint: false  # Orchestrator will calculate
```

### Orchestrator Behavior

```markdown
When task completes:

1. Calculate risk score using algorithm
2. Determine action based on score

If score < 0.3 (very low):
  - Auto-approve
  - No CEO notification
  - Continue to next task

If score 0.3 - 0.5 (low):
  - Auto-approve
  - Add to daily digest
  - Continue to next task

If score 0.5 - 0.6 (medium):
  - Notify CEO immediately
  - Message: "Optional review, auto-approves in 2 hours"
  - Start 2-hour timer
  - If CEO reviews → use CEO decision
  - If 2 hours pass → auto-approve
  - Continue

If score 0.6 - 0.8 (high):
  - PAUSE execution
  - Notify CEO immediately
  - Message: "Approval required: [reason]"
  - Wait for explicit CEO approval
  - On approval → continue
  - On rejection → mark task as rejected, notify agent

If score 0.8 - 1.0 (very high):
  - PAUSE execution
  - Notify CEO with ALERT
  - Message: "CRITICAL review required: [detailed reasons]"
  - Include: risks, mitigation plan, rollback strategy
  - Wait for explicit CEO approval
  - Require CEO to acknowledge risks
  - On approval → continue
  - On rejection → detailed feedback to agent
```

## CEO Override

CEO can always override risk calculation:

```yaml
# In .claude/checkpointing/overrides.yml

overrides:
  # Always require approval for specific things
  always_require_approval:
    - task_type: "database-migration"
    - task_type: "authentication-change"
    - agent: "architect"  # Always review architect decisions

  # Never require approval for specific things
  auto_approve:
    - agent: "technical-writer"  # Trust writer completely
    - product: "internal-tools"  # Low-risk internal product
```

## Benefits

### Reduced CEO Interruptions

**Before (Fixed Checkpoints)**:
```
Product lifecycle: 8 checkpoints
- PRD review
- Architecture review
- Foundation review
- Feature 1 review
- Feature 2 review
- Feature 3 review
- Release review
- Production deploy review

CEO time: ~6 hours per product
```

**After (Smart Checkpointing)**:
```
Product lifecycle: 3 checkpoints (60% reduction)
- Architecture review (high risk: new patterns)
- Production database migration (high risk)
- Production deploy (medium risk: auto-approves after 2h)

Auto-approved:
- PRD (standard product, low risk)
- Foundation (standard stack, low risk)
- Features 1-3 (standard CRUD, low risk)
- Release review (all tests passing, low risk)

CEO time: ~2 hours per product (67% reduction)
```

### Faster Delivery

**Timeline**:
```
Before:
Day 1: PRD → wait for CEO → 4hr delay
Day 2: Architecture → wait for CEO → 4hr delay
Day 3: Foundation → wait for CEO → 4hr delay
Day 4: Feature → wait for CEO → 4hr delay
Total delays: 16 hours

After:
Day 1: PRD → auto-approved → no delay
Day 2: Architecture → wait for CEO → 4hr delay
Day 3: Foundation → auto-approved → no delay
Day 4: Feature → auto-approved → no delay
Total delays: 4 hours (75% reduction)
```

### Maintained Safety

**Critical tasks still require approval**:
- Production changes
- Database migrations
- New architecture patterns
- Authentication/security changes
- External dependency additions

**CEO still has oversight**:
- Daily digest of auto-approved tasks
- Can review optional-review tasks
- Can override with always_require_approval rules
- Alerted for critical changes

## Risk Score Tuning

Monitor risk score effectiveness:

```json
{
  "risk_score_effectiveness": {
    "tasks_evaluated": 150,
    "auto_approved": 90,
    "ceo_approved": 48,
    "ceo_rejected": 12,

    "false_positives": 5,  // Auto-approved but should have been reviewed
    "false_negatives": 2,  // Required approval but was low risk

    "accuracy": 0.95,

    "recommendations": [
      "Lower threshold for database changes (too many false negatives)",
      "Increase confidence in backend-engineer (high success rate)"
    ]
  }
}
```

Adjust thresholds based on data:

```yaml
# Tuning thresholds
risk_thresholds:
  auto_approve: 0.3        # Was 0.3, could increase to 0.35
  optional_review: 0.6     # Was 0.6, working well
  detailed_review: 0.8     # Was 0.8, working well

# Adjust weights
risk_weights:
  task_impact: 0.35        # Increased from 0.3 (more important)
  code_complexity: 0.15    # Decreased from 0.2 (less important)
  # ... adjust based on experience
```

## CEO Dashboard Integration

Dashboard shows smart checkpoint stats:

```markdown
## Smart Checkpointing

**Today**:
- Tasks evaluated: 12
- Auto-approved: 8 (67%)
- CEO approved: 3 (25%)
- CEO rejected: 1 (8%)

**CEO Time Saved**: 4.5 hours today

**Recent Auto-Approvals**:
- DOCS-12: Update README (risk: 0.07)
- BACKEND-42: Add user CRUD (risk: 0.23)
- FRONTEND-18: Style updates (risk: 0.15)

**Pending Review**:
- ARCH-08: Event-driven architecture (risk: 0.58, optional)
  Auto-approves in 1h 23m if no action

**Awaiting Approval**:
- BACKEND-88: Database migration (risk: 0.55, high)
  Requires explicit approval
```

## Future Enhancements

- **ML-based risk prediction**: Learn from CEO decisions
- **Context-aware risk**: Consider time of day, product lifecycle stage
- **Team confidence**: Higher confidence → lower risk
- **Historical analysis**: Tasks similar to past rejections → higher risk
- **A/B testing**: Test different thresholds, measure effectiveness
