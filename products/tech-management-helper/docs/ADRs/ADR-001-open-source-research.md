# ADR-001: Open Source Research for Tech Management Helper

## Status
Accepted

## Context

Tech Management Helper is a GRC (Governance, Risk, and Compliance) platform designed for Technology Managers in regulated industries. Before designing the system from scratch, we researched existing open source solutions, libraries, and components that could accelerate development while maintaining quality.

### Research Areas
1. Full GRC platforms/tools
2. Dashboard/admin panel frameworks
3. UI component libraries
4. Charting/visualization libraries
5. Form handling libraries
6. Authentication solutions
7. PDF generation
8. CSV parsing (for asset import)

## Research Findings

### 1. Full GRC Platforms

| Project | Stars | License | Assessment |
|---------|-------|---------|------------|
| intuitem/mira-community | 50 | AGPL-3.0 | Risk management focused, AGPL license problematic |
| brianwifaneye/NIST-CSF | 166 | MIT | NIST CSF management only, not comprehensive GRC |
| Various GRC repos | <10 | Mixed | Low activity, unmaintained |

**Decision**: No suitable full GRC platform found. The available options are either:
- Too specialized (NIST only, risk only)
- AGPL licensed (requires open-sourcing modifications)
- Low quality/unmaintained

We will **build custom** but leverage proven component libraries.

### 2. Dashboard/Admin Panel Frameworks

| Framework | Stars | License | Assessment |
|-----------|-------|---------|------------|
| refinedev/refine | 33,921 | MIT | Full admin panel framework, REST/GraphQL ready |
| marmelab/react-admin | 26,505 | MIT | Mature, Material UI dependency |
| Kiranism/next-shadcn-dashboard-starter | 5,873 | MIT | Next.js + shadcn/ui starter template |

**Decision**: Use **next-shadcn-dashboard-starter** as reference architecture.
- Aligns with our Next.js + shadcn/ui stack
- Lightweight - not a full framework dependency
- MIT license
- Active maintenance (updated Jan 2026)

We will NOT use full frameworks like react-admin or refine because:
- They add significant bundle size
- They lock us into their patterns
- Our GRC domain has specific needs not well-served by generic admin frameworks

### 3. UI Component Libraries

| Library | Stars | License | Assessment |
|---------|-------|---------|------------|
| shadcn-ui/ui | 105,515 | MIT | Copy-paste components, fully customizable |
| Radix UI (underlying) | 20,000+ | MIT | Accessible primitives |

**Decision**: Use **shadcn/ui** as primary UI component library.
- Massive community adoption (105K+ stars)
- Copy-paste model = full control, no dependency lock-in
- Built on Radix primitives = excellent accessibility
- Tailwind CSS integration matches our stack
- Well-documented with comprehensive component catalog

### 4. Charting/Visualization Libraries

| Library | Stars | License | Assessment |
|---------|-------|---------|------------|
| recharts/recharts | 26,555 | MIT | React-specific, D3-based, composable |
| tremor | 16,000+ | Apache 2.0 | Dashboard components, higher-level |
| Chart.js | 65,000+ | MIT | Canvas-based, not React-native |

**Decision**: Use **Recharts** for data visualization.
- Native React integration
- Composable API fits our component architecture
- Excellent documentation
- Lightweight compared to full dashboard libraries
- Perfect for compliance dashboards, risk matrices, value stream visualization

### 5. Form Handling

| Library | Stars | License | Assessment |
|---------|-------|---------|------------|
| react-hook-form | 44,441 | MIT | Minimal re-renders, excellent DX |
| formik | 34,000+ | Apache 2.0 | More verbose, larger bundle |

**Decision**: Use **React Hook Form + Zod**.
- Best-in-class performance (minimal re-renders)
- Small bundle size
- Zod integration for type-safe validation
- Proven in GPU Calculator product

### 6. Data Tables

| Library | Assessment |
|---------|------------|
| TanStack Table (react-table) | Headless, flexible, performant |
| ag-Grid | Enterprise features, license cost |
| Material React Table | Material UI dependency |

**Decision**: Use **TanStack Table** with shadcn/ui wrapper.
- Headless architecture = full styling control
- Excellent performance with large datasets (10,000+ rows)
- Sorting, filtering, pagination built-in
- MIT license

### 7. Authentication

| Library | Stars | License | Assessment |
|---------|-------|---------|------------|
| nextauthjs/next-auth | 28,015 | ISC | Next.js native, many providers |
| lucia-auth | 10,000+ | MIT | Lightweight, flexible |

**Decision**: Use **NextAuth.js (Auth.js)** for authentication.
- Native Next.js integration
- Built-in session management
- Supports credentials + OAuth providers
- 7-year audit log retention possible with custom adapter

### 8. PDF Generation

| Library | Stars | License | Assessment |
|---------|-------|---------|------------|
| diegomura/react-pdf | 16,337 | MIT | React-native PDF generation |
| pdfmake | 12,000+ | MIT | Declarative PDF definition |
| puppeteer (HTML to PDF) | 90,000+ | Apache 2.0 | Browser-based rendering |

**Decision**: Use **@react-pdf/renderer** for PDF reports.
- React component model for PDF generation
- Complex layouts supported
- Tables, charts, images supported
- Client-side generation option

### 9. CSV Parsing

| Library | Stars | License | Assessment |
|---------|-------|---------|------------|
| mholt/PapaParse | 13,352 | MIT | Fast, handles large files |
| csv-parse | 4,000+ | MIT | Node.js focused |

**Decision**: Use **PapaParse** for CSV import.
- Handles malformed input gracefully
- Streaming for large files
- Browser and Node.js support
- Essential for Asset Inventory CSV import feature

### 10. IT4IT and Framework Data

No open source IT4IT value stream visualization components found. Will **build custom** using:
- Recharts for value stream diagrams
- Static JSON data for framework mappings (NIST CSF, ISO 27001, COBIT)

## Summary: Build vs Use

### Use (Adopted Libraries)

| Library | Purpose | Why |
|---------|---------|-----|
| shadcn/ui | UI components | 105K stars, MIT, customizable, accessible |
| Recharts | Charts/visualization | 26K stars, MIT, React-native |
| React Hook Form | Form handling | 44K stars, MIT, performant |
| Zod | Validation | Type-safe, RHF integration |
| TanStack Table | Data tables | Headless, performant |
| NextAuth.js | Authentication | 28K stars, Next.js native |
| @react-pdf/renderer | PDF reports | React component model |
| PapaParse | CSV import | Fast, robust error handling |
| date-fns | Date utilities | Tree-shakeable, lightweight |

### Build Custom

| Component | Reason |
|-----------|--------|
| GRC domain logic | No suitable OSS available |
| IT4IT visualization | No existing components |
| Risk matrix component | Domain-specific requirements |
| Control catalog | Custom framework mapping needed |
| Compliance dashboard | Specific KPI requirements |

### Avoid

| Library | Reason |
|---------|--------|
| react-admin | Framework lock-in, Material UI |
| refine | Overkill for our needs |
| ag-Grid | Enterprise license needed |
| Material UI | Bundle size, design mismatch |
| Moment.js | Deprecated, use date-fns |
| Chart.js | Not React-native |

## Consequences

### Positive
- Leverage proven, well-maintained libraries (100K+ combined stars)
- MIT/ISC licenses = no legal complications
- Faster development with accessible, tested components
- Community support and documentation available
- Bundle size optimized by avoiding heavy frameworks

### Negative
- Must build GRC-specific components from scratch
- IT4IT visualization requires custom development
- No off-the-shelf compliance templates

### Neutral
- Will need to keep libraries updated
- Learning curve for TanStack Table headless architecture

## References

- shadcn/ui: https://github.com/shadcn-ui/ui
- Recharts: https://github.com/recharts/recharts
- React Hook Form: https://github.com/react-hook-form/react-hook-form
- TanStack Table: https://tanstack.com/table
- NextAuth.js: https://github.com/nextauthjs/next-auth
- @react-pdf/renderer: https://github.com/diegomura/react-pdf
- PapaParse: https://github.com/mholt/PapaParse
- next-shadcn-dashboard-starter: https://github.com/Kiranism/next-shadcn-dashboard-starter

---

*Created by*: Architect Agent
*Date*: 2026-01-26
