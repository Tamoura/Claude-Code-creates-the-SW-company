# Feature Specification: [FEATURE NAME]

**Product**: [PRODUCT_NAME]
**Feature Branch**: `feature/[product]/[feature-id]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### Edge Cases

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]

### Non-Functional Requirements

- **NFR-001**: Performance - [latency/throughput target]
- **NFR-002**: Security - [auth/data protection requirement]
- **NFR-003**: Accessibility - [WCAG level / specific requirement]

### Key Entities

- **[Entity 1]**: [What it represents, key attributes]
- **[Entity 2]**: [What it represents, relationships]

## Component Reuse Check *(mandatory - ConnectSW)*

Before planning, check `.claude/COMPONENT-REGISTRY.md`:

| Need | Existing Component | Reuse? |
|------|-------------------|--------|
| [Need 1] | [Component or "None found"] | [Yes/No/Adapt] |
| [Need 2] | [Component or "None found"] | [Yes/No/Adapt] |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Measurable metric]
- **SC-002**: [Measurable metric]
- **SC-003**: [User satisfaction metric]

## Out of Scope

- [Explicitly NOT included in this feature]
- [Deferred to future iteration]
