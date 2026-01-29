# ADR-001: Open Source Research

## Status
Accepted

## Context

Before designing the ITIL Dashboard from scratch, we conducted comprehensive research to identify existing open source solutions, libraries, and components that could accelerate development and provide proven, battle-tested functionality.

## Research Conducted

### 1. ITSM Dashboard Solutions

**Search queries:**
- "ITSM dashboard"
- "incident management react"
- "help desk react typescript"
- "ticketing system react"

**Findings:**

| Repository | Stars | License | Last Updated | Assessment |
|------------|-------|---------|--------------|------------|
| Em-Power/ITSM-Dashboard | 1 | MIT | Nov 2025 | Too basic, limited features |
| neatlogic/neatlogic-itsm | 47 | AGPL-3.0 | Dec 2025 | Java-based, AGPL license incompatible |
| gokberkh/SupportTicketSystem | 13 | None | Jan 2026 | MongoDB-based, basic ticketing only |

**Conclusion:** No existing open source ITSM dashboard meets our requirements. Most are either:
- Too basic (lack ITIL process coverage)
- Wrong technology stack (Java, PHP, Angular)
- Restrictive licenses (AGPL)
- Outdated or unmaintained

**Decision:** Build custom ITIL dashboard using proven component libraries.

### 2. UI Component Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| shadcn/ui | 85,000+ | MIT | Highly customizable, Tailwind-based, copy-paste components | **ADOPT** |
| Radix UI | 18,000+ | MIT | Underlying primitives for shadcn/ui | **ADOPT** (via shadcn) |
| Tremor | 16,449 | Apache 2.0 | Dashboard-focused, good for metrics | **ADOPT** (for dashboard components) |

**Decision:** Use shadcn/ui as the primary component library with Tremor for dashboard-specific visualizations.

### 3. Data Table Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| @tanstack/react-table | 26,000+ | MIT | Headless, highly flexible, great TypeScript support | **ADOPT** |
| ag-grid | - | Commercial | Expensive, overkill for our needs | Avoid |
| react-data-grid | - | MIT | Less flexible than TanStack | Avoid |

**Decision:** Use @tanstack/react-table v8 for all data grids with shadcn/ui styling.

### 4. Chart Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| Recharts | 26,555 | MIT | React-native, composable, good docs | **ADOPT** |
| Tremor Charts | - | Apache 2.0 | Built on Recharts, pre-styled | **ADOPT** |
| Chart.js | - | MIT | Canvas-based, less React-native | Avoid |
| D3.js | - | ISC | Too low-level for our needs | Avoid |

**Decision:** Use Tremor for dashboard charts (built on Recharts) with Recharts directly for custom visualizations.

### 5. Calendar Components

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| react-big-calendar | 8,639 | MIT | Feature-rich, Google Calendar-like | **ADOPT** |
| schedule-x | 2,152 | MIT | Modern alternative, good design | Consider for future |
| shadcn-ui-big-calendar | 194 | MIT | shadcn styling for react-big-calendar | **ADOPT** |

**Decision:** Use react-big-calendar with shadcn styling for the Change Calendar feature.

### 6. Form Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| react-hook-form | 44,441 | MIT | Performant, minimal re-renders, great DX | **ADOPT** |
| Formik | - | Apache 2.0 | Older, more verbose | Avoid |
| @tanstack/form | 6,256 | MIT | Newer, less ecosystem support | Consider for future |

**Decision:** Use react-hook-form with zod for validation.

### 7. Validation Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| Zod | 41,621 | MIT | TypeScript-first, great inference | **ADOPT** |
| Yup | - | MIT | Less TypeScript-native | Avoid |
| Joi | - | BSD | Node-focused, not ideal for frontend | Avoid |

**Decision:** Use Zod for both frontend and backend validation schemas.

### 8. State Management

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| Zustand | 56,720 | MIT | Simple, performant, minimal boilerplate | **ADOPT** (for global UI state) |
| @tanstack/react-query | 44,000+ | MIT | Server state management, caching | **ADOPT** |
| Redux Toolkit | - | MIT | Overkill for this project | Avoid |
| Jotai | - | MIT | Atomic, but less ecosystem | Avoid |

**Decision:** Use TanStack Query for server state and Zustand for minimal client-only state.

### 9. Date/Time Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| date-fns | 36,000+ | MIT | Tree-shakeable, modern, functional | **ADOPT** |
| luxon | - | MIT | Good timezone support | Consider for SLA calculations |
| dayjs | - | MIT | Lightweight moment.js alternative | Avoid (date-fns preferred) |
| moment.js | - | MIT | Deprecated, not tree-shakeable | Avoid |

**Decision:** Use date-fns for general date operations. Consider luxon for complex business hours/timezone calculations.

### 10. Backend Libraries

**Research:**

| Library | Stars | License | Assessment | Decision |
|---------|-------|---------|------------|----------|
| @fastify/jwt | 574 | MIT | Official Fastify JWT plugin | **ADOPT** |
| @fastify/cookie | - | MIT | Cookie handling | **ADOPT** |
| @fastify/cors | - | MIT | CORS support | **ADOPT** |
| fastify-prisma | 42 | MIT | Prisma plugin for Fastify | **ADOPT** |
| bcrypt | - | MIT | Password hashing | **ADOPT** |

**Decision:** Use official Fastify plugins where available.

### 11. SLA/Business Hours Calculation

**Research:**

No mature, well-maintained library exists for business hours SLA calculation in JavaScript/TypeScript.

**Found options:**
- supportlane/biztime (0 stars, MIT, last updated Nov 2025)
- Various PHP/Java implementations

**Decision:** Build custom SLA calculation module using date-fns/luxon. This is core business logic that benefits from custom implementation for:
- Configurable business hours per organization
- Holiday calendar support
- Timezone handling
- Pause/resume SLA timers

## Summary: Technology Decisions

### Adopted Libraries

| Category | Library | Version | Rationale |
|----------|---------|---------|-----------|
| UI Components | shadcn/ui | Latest | Customizable, accessible, Tailwind-based |
| Charts | Tremor | 3.x | Dashboard-focused, built on Recharts |
| Data Tables | @tanstack/react-table | 8.x | Headless, flexible, TypeScript-first |
| Calendar | react-big-calendar | 1.x | Full-featured, proven |
| Forms | react-hook-form | 7.x | Performant, minimal re-renders |
| Validation | Zod | 3.x | TypeScript-first, shared schemas |
| Server State | @tanstack/react-query | 5.x | Caching, optimistic updates |
| Client State | Zustand | 4.x | Simple global state |
| Date/Time | date-fns | 4.x | Modern, tree-shakeable |
| Backend Auth | @fastify/jwt | Latest | Official Fastify plugin |

### Libraries to Avoid

| Library | Reason |
|---------|--------|
| Redux | Overkill, unnecessary complexity |
| Moment.js | Deprecated, not tree-shakeable |
| Formik | Older, more verbose than react-hook-form |
| ag-grid | Commercial license, overkill |
| Chart.js | Less React-native than Recharts |

### Custom Build Required

| Component | Reason |
|-----------|--------|
| SLA Timer Module | No existing library meets requirements |
| Business Hours Calculator | Custom business rules needed |
| ITIL Workflow Engine | Specific to ITIL processes |
| Audit Trail System | Custom requirements for compliance |

## Consequences

### Positive
- Using proven, well-maintained libraries reduces risk
- Large community support for troubleshooting
- TypeScript-first libraries ensure type safety
- Flexible, customizable components for ITIL-specific needs
- MIT/Apache licenses are business-friendly

### Negative
- Custom SLA module requires more development effort
- Multiple libraries require integration work
- Team needs familiarity with chosen stack

### Neutral
- Component library updates may require migration effort
- Documentation quality varies across libraries

## References

- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tremor](https://tremor.so/) - Dashboard components
- [TanStack Table](https://tanstack.com/table) - Data tables
- [TanStack Query](https://tanstack.com/query) - Server state
- [Zustand](https://zustand-demo.pmnd.rs/) - Client state
- [react-hook-form](https://react-hook-form.com/) - Forms
- [Zod](https://zod.dev/) - Validation
- [date-fns](https://date-fns.org/) - Date utilities
- [react-big-calendar](https://github.com/jquense/react-big-calendar) - Calendar
- [Fastify](https://www.fastify.io/) - Backend framework
