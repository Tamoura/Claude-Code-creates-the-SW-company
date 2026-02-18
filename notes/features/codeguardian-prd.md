# CodeGuardian PRD - Feature Notes

**Branch**: `feature/codeguardian/prd`
**Task ID**: PRD-01
**Date Started**: 2026-02-18

## Summary

Created the comprehensive PRD and product addendum for CodeGuardian, the multi-model AI code review and security platform.

## Key Decisions

1. **Scoring weights**: Security (35%), Logic (30%), Performance (20%), Style (15%). Security is weighted highest because it has the most severe consequences if missed. Style is lowest because it is the least impactful.

2. **Default model routing**: Security to Claude Sonnet, Logic to Claude Opus, Performance to GPT-4o, Style to Claude Haiku. Rationale: match model strength to task type. Opus for deep reasoning, Sonnet for security pattern matching, Haiku for speed on simple checks.

3. **Free tier limit**: 5 PRs/month, 1 repository. Low enough to drive conversion, high enough to be useful for evaluation. Can be adjusted based on cost data.

4. **Diff chunking strategy**: Split at 500 lines by file boundaries, max 20 chunks. Balances thoroughness vs. cost.

5. **Review lifecycle**: 8 states (Pending -> Queued -> Analyzing -> ModelsRunning -> Aggregating -> Scoring -> Posting -> Complete). PartialFailure and Failed are error branches. This granularity supports detailed progress tracking and debugging.

6. **Enterprise pricing**: $199/user/month with minimum 5 seats. Annual commitment option with 15% discount. Net-30 payment terms.

7. **Ports**: Frontend 3115, Backend API 5011 (as specified in the CEO brief).

## Files Created

- `products/codeguardian/docs/PRD.md` -- Full PRD with all required sections
- `products/codeguardian/.claude/addendum.md` -- Product addendum with site map, business logic, tech stack
- `notes/features/codeguardian-prd.md` -- This file

## Diagrams Included

- C4 Context Diagram (Level 1)
- C4 Container Diagram (Level 2)
- New User Onboarding Flow (flowchart)
- PR Review Flow (flowchart)
- Team Lead Dashboard Flow (flowchart)
- PR Review Processing Sequence Diagram (end-to-end)
- GitHub OAuth Authentication Sequence Diagram
- Subscription Upgrade Sequence Diagram
- Review Lifecycle State Diagram
- Subscription Lifecycle State Diagram
- Entity-Relationship Diagram (8 entities)

## Next Steps

After PRD approval (CHECKPOINT), the Architect (ARCH-01) takes over for system design.
