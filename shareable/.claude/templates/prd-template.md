# Product Requirements Document Template

Use this template when creating a PRD. Save to `products/[product]/docs/PRD.md`.

---

# [Product Name] - Product Requirements Document

**Version**: 1.0
**Last Updated**: [Date]
**Author**: Product Manager Agent
**Status**: Draft | In Review | Approved

---

## 1. Overview

### 1.1 Vision Statement

[One paragraph describing what this product is and why it matters]

### 1.2 Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| [Objective 1] | [How measured] | [Success threshold] |
| [Objective 2] | [How measured] | [Success threshold] |

### 1.3 Scope

**In Scope:**
- [What's included]

**Out of Scope:**
- [What's explicitly NOT included]

---

## 2. User Personas

### 2.1 [Persona Name]

| Attribute | Details |
|-----------|---------|
| **Role** | [Job title/role] |
| **Goals** | [What they want to achieve] |
| **Pain Points** | [Current frustrations] |
| **Tech Savviness** | [Low/Medium/High] |
| **Usage Frequency** | [Daily/Weekly/Monthly] |

**Quote**: "[A quote that captures their mindset]"

### 2.2 [Persona Name]

[Repeat structure for each persona]

---

## 3. User Stories & Requirements

### 3.1 Epic: [Epic Name]

#### US-001: [User Story Title]

**Story**: As a [persona], I want [goal] so that [benefit].

**Acceptance Criteria**:
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [action], then [result]

**Priority**: P0 (Must Have) | P1 (Should Have) | P2 (Nice to Have)

**Notes**: [Any additional context]

---

#### US-002: [User Story Title]

[Repeat structure for each user story]

---

## 4. User Flows

### 4.1 [Flow Name]

**Trigger**: [What initiates this flow]

```
[Step 1: Action]
    │
    ▼
[Step 2: Action]
    │
    ├── [Condition A] ──► [Step 3A]
    │
    └── [Condition B] ──► [Step 3B]
    │
    ▼
[Final Step: Outcome]
```

**Happy Path**: [Describe the ideal flow]

**Error Cases**:
- [Error 1]: [How handled]
- [Error 2]: [How handled]

---

## 5. Functional Requirements

### 5.1 [Category]

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-001 | [Requirement description] | P0 | [Notes] |
| FR-002 | [Requirement description] | P0 | [Notes] |

### 5.2 [Category]

[Repeat structure]

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | Page load time | < 2 seconds |
| NFR-P02 | API response time | < 500ms (p95) |

### 6.2 Security

| ID | Requirement |
|----|-------------|
| NFR-S01 | [Security requirement] |
| NFR-S02 | [Security requirement] |

### 6.3 Accessibility

| ID | Requirement |
|----|-------------|
| NFR-A01 | WCAG 2.1 AA compliance |
| NFR-A02 | Keyboard navigation support |

### 6.4 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R01 | Uptime | 99.9% |
| NFR-R02 | Data backup | Daily |

---

## 7. Data Requirements

### 7.1 Data Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| [Entity 1] | [What it represents] | [Important fields] |
| [Entity 2] | [What it represents] | [Important fields] |

### 7.2 Data Retention

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| [Type 1] | [Duration] | [Why] |

---

## 8. Integration Requirements

### 8.1 External Systems

| System | Purpose | Type | Priority |
|--------|---------|------|----------|
| [System 1] | [Why needed] | API/OAuth/etc. | P0 |

---

## 9. Release Plan

### MVP (Phase 1)

**Goal**: [What MVP achieves]

**Features Included**:
- US-001: [Title]
- US-002: [Title]

### Phase 2

**Goal**: [What Phase 2 adds]

**Features Included**:
- US-003: [Title]
- US-004: [Title]

---

## 10. Success Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| [Metric 1] | [How defined] | [Goal] | [How measured] |

---

## 11. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to address] |

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | [Question] | [Who decides] | Open/Resolved |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| [Term] | [Definition] |

### B. References

- [Link to research]
- [Link to competitor analysis]
- [Link to CEO brief]

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CEO | | | |
| Product Manager | Agent | | |
