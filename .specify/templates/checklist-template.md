# Requirements Quality Checklist: [FEATURE NAME]

**Product**: [PRODUCT_NAME]
**Created**: [DATE]
**Spec**: [Link to spec.md]

## Meta

This checklist validates **specification quality** — whether requirements are complete, clear, and testable. It does NOT test implementation behavior.

## Completeness

- [ ] CHK001 Are all user personas defined with goals and pain points? [Spec §2]
- [ ] CHK002 Is MVP scope clearly bounded with explicit out-of-scope items? [Spec §7]
- [ ] CHK003 Are all functional requirements specified with measurable criteria? [Spec §5.1]
- [ ] CHK004 Are non-functional requirements quantified (latency targets, uptime %)? [Spec §5.2]
- [ ] CHK005 Are all page routes listed in the site map with status (MVP/Coming Soon)? [Spec §Site Map]

## Clarity

- [ ] CHK010 Are all acceptance criteria written in Given/When/Then format? [Spec §6]
- [ ] CHK011 Is all domain terminology consistent (no synonym conflicts)? [Completeness]
- [ ] CHK012 Are there zero `[NEEDS CLARIFICATION]` markers remaining? [Gap]
- [ ] CHK013 Are edge cases and error scenarios documented? [Spec §Edge Cases]

## Consistency

- [ ] CHK020 Do user stories align with functional requirements (no orphans)? [Consistency]
- [ ] CHK021 Do acceptance criteria cover all functional requirements? [Coverage]
- [ ] CHK022 Are entity relationships consistent between spec and data model? [Consistency]
- [ ] CHK023 Does the component reuse table reference valid registry entries? [ConnectSW §II]

## Testability

- [ ] CHK030 Can every acceptance criterion be verified with a Playwright E2E test? [Testability]
- [ ] CHK031 Are success criteria measurable without subjective judgment? [Spec §Success Criteria]
- [ ] CHK032 Are test data requirements specified for each user story? [Testability]

## ConnectSW Compliance

- [ ] CHK040 Does spec reference assigned ports from PORT-REGISTRY.md? [Constitution §VII]
- [ ] CHK041 Has COMPONENT-REGISTRY.md been checked for reusable components? [Constitution §II]
- [ ] CHK042 Does spec use ConnectSW default stack or reference ADR for deviation? [Constitution §V]
- [ ] CHK043 Are git branch naming conventions followed? [Constitution §VIII]
