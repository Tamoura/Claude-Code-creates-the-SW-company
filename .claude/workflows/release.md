# Workflow: Release

This workflow guides the Orchestrator through releasing a product version to production.

## Trigger

CEO says something like:
- "Ship [product] to production"
- "Release [product]"
- "Deploy [product] v[X.Y.Z]"

Or scheduled release after sprint completion.

## Prerequisites

- Product exists and has been in development
- main branch is stable (all tests passing)
- No critical open bugs

## Workflow Steps

### Phase 1: Pre-Release Verification

```
Step 1.1: Check Readiness
├── All PRs for release merged to main
├── All tests passing on main
├── No critical/high priority open bugs
├── Changelog updated
└── If not ready: Report blockers to CEO

Step 1.2: Full Regression
├── Invoke QA Engineer agent
├── Tasks:
│   ├── Run full E2E test suite
│   ├── Manual smoke test of critical paths
│   ├── Performance check (if applicable)
│   └── Report any issues found
└── All tests must pass

Step 1.3: Prepare Release
├── Determine version number (semver):
│   ├── MAJOR: Breaking changes
│   ├── MINOR: New features
│   └── PATCH: Bug fixes only
├── Invoke Technical Writer agent:
│   ├── Finalize CHANGELOG.md
│   ├── Update version in package.json
│   └── Create release notes
└── Commit to release branch
```

### Phase 2: Staging Deployment

```
Step 2.1: Create Release Branch
├── Branch from main: release/[product]/v[X.Y.Z]
├── Version bump committed
├── Changelog finalized
└── Push branch

Step 2.2: Deploy to Staging
├── Invoke DevOps Engineer agent
├── Tasks:
│   ├── Run staging deployment
│   ├── Run database migrations
│   ├── Verify deployment success
│   └── Run smoke tests
└── Report deployment status

Step 2.3: Staging Verification
├── Invoke QA Engineer agent
├── Tasks:
│   ├── Full smoke test on staging
│   ├── Verify all critical paths
│   ├── Check for staging-specific issues
│   └── Sign off on staging
└── Must pass before production

CHECKPOINT: Staging Approval
├── Notify CEO: "Staged and verified. Ready for production?"
├── Provide:
│   ├── Release notes
│   ├── What's included
│   ├── Staging URL for testing
│   └── Any concerns/risks
├── Wait for: CEO approval
└── On approval: Proceed to production
```

### Phase 3: Production Deployment

```
Step 3.1: Production Deployment
├── Invoke DevOps Engineer agent
├── Tasks:
│   ├── Backup production database
│   ├── Run production deployment
│   ├── Run database migrations
│   ├── Verify deployment success
│   └── Health checks passing
└── Report deployment status

Step 3.2: Production Verification
├── Invoke Support Engineer agent
├── Tasks:
│   ├── Smoke test production
│   ├── Monitor error rates
│   ├── Monitor performance metrics
│   └── Report any issues
└── Continue monitoring for 30 minutes

Step 3.3: Finalize Release
├── If all good:
│   ├── Merge release branch to main
│   ├── Create git tag: v[X.Y.Z]
│   ├── Create GitHub release with notes
│   └── Delete release branch
└── If issues: Initiate rollback (see below)
```

### Phase 4: Post-Release

```
Step 4.1: Update State
├── Update product version in state.yml
├── Clear release-related tasks
└── Update last_activity

Step 4.2: Notify
├── Notify CEO: "Release complete"
├── Provide:
│   ├── Version released
│   ├── Production URL
│   ├── Release notes link
│   └── Monitoring status
└── Release complete
```

## Rollback Procedure

If issues are detected in production:

```
Issue Detected
      │
      ▼
┌─────────────────┐
│ Assess Severity │
├─────────────────┤
│ Critical: Data  │──► Immediate rollback
│ loss, security  │
├─────────────────┤
│ High: Major     │──► Rollback within 15 min
│ feature broken  │
├─────────────────┤
│ Medium: Some    │──► Hotfix if quick
│ impact          │    Rollback if not
├─────────────────┤
│ Low: Minor      │──► Hotfix in next release
└─────────────────┘

Rollback Steps:
1. Invoke DevOps Engineer
2. Execute rollback script
3. Restore database if needed
4. Verify previous version running
5. Notify CEO
6. Create issue for fixing
```

## Version Numbering

Following Semantic Versioning (semver):

```
v[MAJOR].[MINOR].[PATCH]

Examples:
v1.0.0 → v1.0.1  (patch: bug fix)
v1.0.1 → v1.1.0  (minor: new feature)
v1.1.0 → v2.0.0  (major: breaking change)
```

## Release Notes Template

```markdown
# [Product Name] v[X.Y.Z]

Released: [Date]

## Highlights

[1-2 sentence summary of the most important changes]

## New Features

- **[Feature Name]**: [Brief description] (#[PR])
- **[Feature Name]**: [Brief description] (#[PR])

## Improvements

- [Improvement description] (#[PR])
- [Improvement description] (#[PR])

## Bug Fixes

- Fixed [bug description] (#[issue])
- Fixed [bug description] (#[issue])

## Breaking Changes

- [Description of breaking change and migration path]

## Dependencies

- Updated [dependency] from [old] to [new]

## Contributors

Thanks to everyone who contributed to this release!
```

## State Updates

```yaml
products:
  [product]:
    phase: production
    version: "X.Y.Z"
    last_release: "2025-01-25T00:00:00Z"
    last_activity: "2025-01-25T00:00:00Z"
```

## Checklist

### Pre-Release
- [ ] All planned features merged
- [ ] All tests passing
- [ ] No critical/high open bugs
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes prepared

### Staging
- [ ] Deployed successfully
- [ ] Smoke tests passing
- [ ] QA sign-off
- [ ] CEO approval

### Production
- [ ] Database backed up
- [ ] Deployed successfully
- [ ] Smoke tests passing
- [ ] Monitoring normal
- [ ] Git tag created
- [ ] GitHub release created
- [ ] CEO notified

## Error Handling

| Error | Resolution |
|-------|------------|
| Tests fail pre-release | Fix before releasing |
| Staging deploy fails | Investigate, fix, retry |
| Production deploy fails | Rollback, investigate |
| Post-deploy issues | Assess severity, rollback if critical |
