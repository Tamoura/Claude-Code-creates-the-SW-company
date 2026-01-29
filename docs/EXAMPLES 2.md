# Real-World Examples

**ConnectSW - AI Software Company**
**Reading Time**: 10 minutes

---

## Overview

This guide shows you exactly what to say to the Orchestrator and what happens next.

---

## Example 1: Create New Product

### Scenario
You want to build a task management app for remote teams.

### What You Say

```
/orchestrator New product: task management app for remote teams
```

### What Happens

**Phase 1: PRD Creation** (30 minutes)
1. Product Manager agent creates PRD
2. Orchestrator pauses: "PRD complete - please review"
3. You review `products/task-manager/docs/PRD.md`
4. You approve or request changes

**Phase 2: Architecture** (1 hour)
1. Architect designs system
2. Creates database schema, API contracts
3. Orchestrator pauses: "Architecture complete - please review"
4. You review `products/task-manager/docs/architecture.md`
5. You approve

**Phase 3: Development** (2-3 days)
1. Backend Engineer builds API
2. Frontend Engineer builds UI
3. QA Engineer writes tests
4. Work happens in parallel
5. Orchestrator pauses: "Feature complete - PR ready"

**Phase 4: Deployment** (30 minutes)
1. You review the PR
2. You approve
3. DevOps Engineer deploys
4. Orchestrator confirms: "task-manager live at https://..."

### Expected Outcome

- New repository: `products/task-manager/`
- Working app with:
  - User authentication
  - Task CRUD operations
  - Basic UI
- Test suite (80%+ coverage)
- Deployment ready

### Timeline
- **Fast track** (prototype): 4-6 hours
- **Full product**: 3-5 days

---

## Example 2: Add Feature

### Scenario
Your task-manager app needs email notifications when tasks are assigned.

### What You Say

```
/orchestrator Add feature: email notifications for task assignments to task-manager
```

### What Happens

**Phase 1: Requirements** (15 minutes)
1. Product Manager updates PRD with feature spec
2. Orchestrator pauses: "Feature spec ready - please review"
3. You review and approve

**Phase 2: Implementation** (2-4 hours)
1. Backend Engineer:
   - Adds SendGrid integration
   - Creates email templates
   - Adds webhook for task assignments
2. Frontend Engineer:
   - Adds notification settings page
   - Updates task assignment UI
3. QA Engineer:
   - Tests email delivery
   - Tests settings page
4. Orchestrator pauses: "Feature complete - PR ready"

**Phase 3: Deployment** (15 minutes)
1. You review PR
2. Approve
3. Deployed to production

### Expected Outcome

- Email sent when task assigned
- User can configure email preferences
- All tests passing
- Feature live in production

### Timeline
- 3-5 hours total

---

## Example 3: Fix Bug

### Scenario
Users report that the login button doesn't work on mobile.

### What You Say

```
/orchestrator Fix bug: login button not working on mobile in task-manager
```

### What Happens

**Phase 1: Triage** (5 minutes)
1. Support Engineer investigates
2. Identifies root cause (CSS issue)
3. Routes to Frontend Engineer

**Phase 2: Fix** (30 minutes)
1. Frontend Engineer:
   - Reproduces bug on mobile
   - Fixes CSS
   - Adds mobile-specific test
2. QA Engineer:
   - Verifies fix on multiple devices
   - Runs regression tests
3. Orchestrator pauses: "Bug fix ready - PR ready"

**Phase 3: Deployment** (10 minutes)
1. You review (or auto-approve for hotfixes)
2. Deployed immediately

### Expected Outcome

- Login button works on all mobile devices
- Regression test added
- Hotfix deployed within 1 hour

### Timeline
- 45 minutes to 1 hour

---

## Example 4: Ship to Production

### Scenario
Your task-manager MVP is ready to launch.

### What You Say

```
/orchestrator Ship task-manager to production
```

### What Happens

**Phase 1: Pre-Deployment Checks** (15 minutes)
1. QA Engineer runs full test suite
2. Security Engineer runs security scan
3. DevOps Engineer checks infrastructure
4. Orchestrator reports: "All checks passed" or lists issues

**Phase 2: Deployment** (30 minutes)
1. DevOps Engineer:
   - Creates production database
   - Sets up environment variables
   - Configures CDN
   - Deploys backend + frontend
2. Orchestrator monitors deployment
3. Smoke tests run automatically

**Phase 3: Verification** (15 minutes)
1. QA Engineer runs production smoke tests
2. Orchestrator confirms: "Deployment successful"
3. Provides URLs:
   - Frontend: https://task-manager.yourcompany.com
   - API: https://api.task-manager.yourcompany.com
   - Admin: https://admin.task-manager.yourcompany.com

### Expected Outcome

- App live in production
- All services healthy
- Monitoring enabled
- Rollback plan ready

### Timeline
- 1 hour total

---

## Example 5: Status Update

### Scenario
You want to know what's happening across all products.

### What You Say

```
/orchestrator Status update
```

### What Happens

Orchestrator generates report:

```
ConnectSW Status Report
Generated: 2026-01-28 14:30

ACTIVE PRODUCTS (3):

1. task-manager
   Status: In Development
   Progress: 75% complete
   Active: Backend Engineer (building notifications API)
   Next: PR review (ETA: 2 hours)

2. analytics-dashboard
   Status: Testing
   Progress: 95% complete
   Active: QA Engineer (running E2E tests)
   Next: Deployment (ETA: 1 hour)

3. stablecoin-gateway
   Status: Production
   Progress: 100% complete
   Metrics: 10 merchants, $50k volume
   Next: Month 2 public launch (Feb 1)

PENDING CHECKPOINTS (1):
- analytics-dashboard: PR ready for review

RECENT ACTIVITY:
- 3 hours ago: stablecoin-gateway deployed
- 5 hours ago: task-manager feature "notifications" started
- Yesterday: analytics-dashboard testing started

TEAM STATUS:
- Backend Engineer: Active (task-manager)
- Frontend Engineer: Available
- QA Engineer: Active (analytics-dashboard)
- DevOps Engineer: Available
```

### Timeline
- Instant

---

## Example 6: Complex Request

### Scenario
You want to convert a prototype to a full product.

### What You Say

```
/orchestrator Convert stablecoin-gateway from prototype to full product
```

### What Happens

**Phase 1: Assessment** (30 minutes)
1. Architect reviews prototype code
2. Identifies gaps (missing tests, no error handling, etc.)
3. Creates upgrade plan
4. Orchestrator pauses: "Upgrade plan ready"

**Phase 2: Execution** (1-2 weeks)
1. Backend Engineer:
   - Adds comprehensive error handling
   - Implements security best practices
   - Adds logging and monitoring
2. Frontend Engineer:
   - Improves UI/UX
   - Adds loading states
   - Implements responsive design
3. QA Engineer:
   - Writes full test suite
   - Adds E2E tests
   - Runs load tests
4. DevOps Engineer:
   - Sets up CI/CD
   - Configures production infrastructure
   - Adds monitoring
5. Security Engineer:
   - Runs security audit
   - Fixes vulnerabilities
   - Implements security headers

**Phase 3: Launch** (3 days)
1. Final review and testing
2. Deployment to production
3. Monitoring and support

### Expected Outcome

- Production-ready product
- 80%+ test coverage
- Security hardened
- Scalable infrastructure
- Monitoring enabled

### Timeline
- 1-2 weeks

---

## Example 7: Multi-Product Workflow

### Scenario
You're building an ecosystem: main app + admin panel + mobile app.

### What You Say

```
/orchestrator New product: customer portal (web app)
/orchestrator New product: admin dashboard (web app)
/orchestrator New product: mobile app (iOS + Android)
```

### What Happens

Orchestrator coordinates:

**Week 1**:
- All three PRDs created in parallel
- Shared architecture planned (same database, shared API)
- You approve all three

**Week 2-3**:
- Shared API built first (Backend Engineer)
- Three frontends built in parallel:
  - Frontend Engineer #1: Customer portal
  - Frontend Engineer #2: Admin dashboard
  - Mobile Developer: Mobile app
- Shared components library created

**Week 4**:
- Integration testing
- Cross-product features (SSO, shared auth)
- Deployment

### Expected Outcome

- Three integrated products
- Shared backend
- Consistent UX across platforms
- All deployed together

### Timeline
- 4 weeks

---

## Example 8: Handling Failures

### Scenario
The Orchestrator can't complete a task (e.g., tests keep failing).

### What Happens

**Attempt 1**: Backend Engineer fixes tests
- Result: Still failing

**Attempt 2**: Backend Engineer tries different approach
- Result: Still failing

**Attempt 3**: QA Engineer investigates root cause
- Result: Found issue (database migration problem)

**Checkpoint**: Orchestrator pauses
```
I've attempted this 3 times but tests are still failing.

Root cause: Database migration missing for new feature
Options:
1. Add missing migration (recommended)
2. Rollback feature
3. Continue anyway (not recommended)

What would you like to do?
```

You respond: "Option 1"

**Resolution**: Backend Engineer adds migration, tests pass.

### Key Point
After 3 failures, Orchestrator stops and asks for guidance.

---

## Example 9: Emergency Hotfix

### Scenario
Production is down. Users can't log in.

### What You Say

```
/orchestrator URGENT: Login is broken in production for task-manager
```

### What Happens

**Immediate** (5 minutes):
1. Support Engineer confirms issue
2. Orchestrator prioritizes as P0
3. Routes to on-call engineer

**Investigation** (10 minutes):
1. Backend Engineer checks logs
2. Identifies issue (API key expired)
3. Proposes fix

**Fix** (10 minutes):
1. Backend Engineer rotates API key
2. Updates environment variables
3. Restarts service

**Verification** (5 minutes):
1. QA Engineer tests login
2. Confirms fix

**Total**: 30 minutes from report to resolution

### Timeline
- Critical fixes: 30 minutes to 1 hour
- Automated rollback if fix fails

---

## Example 10: Knowledge Queries

### Scenario
You want to know how authentication works in your products.

### What You Say

```
/orchestrator How does authentication work in our products?
```

### What Happens

Orchestrator queries knowledge base:

```
Authentication Pattern (Used in 3 products)

Technology: JWT tokens + bcrypt

Implementation:
1. User signs up → password hashed with bcrypt (cost 12)
2. User logs in → JWT access token (15min) + refresh token (7 days)
3. Access token stored in memory (secure)
4. Refresh token in httpOnly cookie (XSS protection)

Used In:
- task-manager (Backend Engineer, 2026-01-15)
- stablecoin-gateway (Backend Engineer, 2026-01-20)
- analytics-dashboard (Backend Engineer, 2026-01-25)

Code Location:
- Auth service: apps/api/src/services/auth.service.ts
- Auth routes: apps/api/src/routes/v1/auth.ts
- Middleware: apps/api/src/plugins/auth.ts

Security:
- Rate limiting: 5 requests/15min on /login
- Token revocation: Supported (logout endpoint)
- Password strength: Minimum 8 chars, 1 uppercase, 1 number
```

### Timeline
- Instant

---

## Common Patterns

### Pattern 1: Iterative Development

```
1. /orchestrator Prototype: [idea]            (4 hours)
2. Test with users, get feedback
3. /orchestrator Add feature: [feedback]       (2 hours)
4. Repeat step 2-3 several times
5. /orchestrator Convert to full product       (1 week)
6. /orchestrator Ship to production            (1 hour)
```

### Pattern 2: Fix-Test-Deploy

```
1. /orchestrator Fix bug: [description]        (30 min)
2. Review PR
3. Approve
4. Auto-deployed to production                 (10 min)
```

### Pattern 3: Feature Branches

```
1. /orchestrator Add feature: [description]
2. Developed on feature branch
3. PR created when complete
4. You review and approve
5. Merged to main
6. Auto-deployed
```

---

## Tips & Tricks

### Be Specific

❌ **Vague**: "Add user management"
✅ **Specific**: "Add user invite system with email confirmation and role-based permissions"

### Reference Products

❌ **Ambiguous**: "Fix the login bug"
✅ **Clear**: "Fix login bug in task-manager where 2FA doesn't work"

### Provide Context

❌ **No context**: "This doesn't work"
✅ **With context**: "When users click 'Export PDF' in analytics-dashboard, they get a 500 error"

### Ask Questions

You can ask the Orchestrator anything:
- "What's the status of task-manager?"
- "How does authentication work?"
- "What products use PostgreSQL?"
- "Show me the last 5 commits"
- "What tasks are blocked?"

---

## What You Can't Do (Yet)

- **Can't modify system prompts** (agents have fixed roles)
- **Can't skip quality gates** (tests must pass)
- **Can't deploy without approval** (checkpoints required)
- **Can't work on closed-source 3rd party code** (legal restriction)

---

## Next Steps

**New to the system?**
1. Start with [CEO Guide](CEO-GUIDE.md)
2. Try Example 1 (create new product)
3. Experiment with other examples

**Want to learn more?**
- [Quick Reference](QUICK-REFERENCE.md) - Common commands
- [Troubleshooting](TROUBLESHOOTING.md) - When things go wrong
- [FAQ](FAQ.md) - Common questions
- [Documentation Index](DOCUMENTATION-INDEX.md) - All docs

---

[Back to Documentation Index](DOCUMENTATION-INDEX.md)
