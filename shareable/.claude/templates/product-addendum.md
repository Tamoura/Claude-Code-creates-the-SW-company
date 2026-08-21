# Product Addendum Template

This template defines product-specific context that agents reference when working on a product. Created by Product Manager or Architect during product inception.

Save to: `products/[product-name]/.claude/addendum.md`

---

# [Product Name] - Agent Addendum

## Product Overview

**Name**: [Product name]
**Type**: [Web app / Mobile app / API / CLI / Library]
**Status**: [Inception / Development / Production]

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | [e.g., Next.js 14, React 18] | |
| Backend | [e.g., Fastify, None] | |
| Database | [e.g., PostgreSQL, None] | |
| Styling | [e.g., Tailwind CSS, shadcn/ui] | |
| Testing | [e.g., Vitest, Playwright] | |
| Deployment | [e.g., Vercel, Render] | |

## Libraries & Dependencies

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| [library] | [purpose] | [reason - from ADR] |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| [library] | [why we're not using it] |

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | [Description] |
| /feature | MVP | [Description] |
| /settings | Coming Soon | [Description] |

## Design Patterns

### Component Patterns
[Product-specific component patterns]

### State Management
[How state is managed in this product]

### API Patterns
[API design patterns for this product]

## Business Logic

### Key Calculations/Algorithms
[Document any core business logic]

### Validation Rules
[Product-specific validation requirements]

## Data Models

### Key Entities
[List main data entities and their relationships]

## External Integrations

| Service | Purpose | Documentation |
|---------|---------|---------------|
| [service] | [why used] | [link] |

## Performance Requirements

- Page load: [target]
- Bundle size: [target]
- API response: [target]

## Special Considerations

[Any product-specific rules, constraints, or considerations agents should know]

---

*Created by*: [Product Manager / Architect]
*Last Updated*: [Date]
