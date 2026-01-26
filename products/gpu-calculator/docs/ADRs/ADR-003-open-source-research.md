# ADR-003: Open Source Research - Libraries and Existing Solutions

**Status**: Accepted
**Date**: 2026-01-26
**Decision Makers**: Architect Agent
**Context**: AI GPU Usage Calculator MVP

---

## Context

Before building the GPU Calculator, we need to evaluate existing open source solutions and component libraries to:
1. Avoid reinventing the wheel
2. Leverage battle-tested libraries for common functionality
3. Make informed build vs. adopt decisions
4. Ensure we use well-maintained, properly licensed dependencies

---

## Research Summary

### 1. Existing Cloud Cost Calculator Solutions

#### 1.1 Infracost (infracost/infracost)
- **URL**: https://github.com/infracost/infracost
- **Stars**: 10,000+
- **License**: Apache 2.0
- **Last Updated**: Active (January 2026)
- **Description**: Cloud cost estimates for Terraform in pull requests. Supports AWS, Azure, GCP with 1,100+ Terraform resources.

**Relevance to Our Project**:
- **LOW** - Infracost is Terraform-focused infrastructure cost estimation
- Not suitable for our use case (ML/GPU workload cost calculation)
- Different audience (DevOps vs ML Engineers)
- Could potentially use their pricing data sources as reference

#### 1.2 Cloud Compare App (Notover1008/cloud-compare-app)
- **URL**: https://github.com/Notover1008/cloud-compare-app
- **Stars**: <10 (very new)
- **License**: MIT
- **Last Updated**: November 2025
- **Description**: Open source cloud cost calculator comparing AWS, Azure, GCP

**Relevance to Our Project**:
- **MEDIUM** - Similar concept but different focus
- Uses Next.js + shadcn/ui + Recharts (aligns with our stack)
- Backend-dependent (Java/Spring Boot) - we are client-only
- General compute focus, not GPU/ML specific
- **Takeaway**: Good reference for UI patterns but not directly usable

#### 1.3 Other GPU/ML Cost Tools Found
- No significant open source GPU-specific cost calculators found
- Most ML cost tools are proprietary (Anyscale, Modal, etc.)
- **Opportunity**: We fill a gap in the open source ecosystem

---

### 2. UI Component Libraries

#### 2.1 shadcn/ui (RECOMMENDED)
- **URL**: https://ui.shadcn.com/
- **GitHub**: https://github.com/shadcn-ui/ui
- **Stars**: 80,000+
- **License**: MIT
- **Last Updated**: Active (January 2026)

**Why Recommended**:
| Criterion | Assessment |
|-----------|------------|
| License | MIT - fully permissive |
| Maintenance | Very active, regular updates |
| React Compatibility | Built for React 18+ |
| Tailwind Integration | Native Tailwind CSS styling |
| Customization | Copy-paste ownership model |
| Accessibility | Built on Radix UI primitives (WCAG compliant) |
| Bundle Size | Zero runtime - just the components you use |

**Components We Would Use**:
- `Input` - form fields for model parameters
- `Select` - GPU type selection dropdowns
- `Tabs` - Training/Inference mode switching
- `Card` - Provider comparison cards
- `Table` - Detailed breakdown tables
- `Button` - Calculate actions
- `Tooltip` - Help text and explanations
- `Accordion` - Expandable provider details

**Decision**: **ADOPT** shadcn/ui for all UI components

---

#### 2.2 React Hook Form (RECOMMENDED)
- **URL**: https://react-hook-form.com/
- **NPM**: https://www.npmjs.com/package/react-hook-form
- **GitHub**: https://github.com/react-hook-form/react-hook-form
- **Weekly Downloads**: 16+ million
- **License**: MIT
- **Last Updated**: Active (January 2026)

**Why Recommended**:
| Criterion | Assessment |
|-----------|------------|
| License | MIT |
| Bundle Size | ~9KB minified |
| Performance | Minimal re-renders via refs |
| Validation | Works with Zod via @hookform/resolvers |
| TypeScript | First-class support |
| Documentation | Excellent |

**Decision**: **ADOPT** React Hook Form for form state management

---

#### 2.3 Zod (RECOMMENDED)
- **URL**: https://zod.dev/
- **GitHub**: https://github.com/colinhacks/zod
- **Stars**: 35,000+
- **License**: MIT
- **Last Updated**: Active (January 2026)

**Why Recommended**:
| Criterion | Assessment |
|-----------|------------|
| License | MIT |
| TypeScript | Schema validation with type inference |
| Bundle Size | ~13KB minified |
| Integration | Works with React Hook Form via resolvers |

**Use Cases**:
- Validate calculator inputs (positive numbers, valid ranges)
- Type-safe form data handling
- Runtime validation of pricing data structure

**Decision**: **ADOPT** Zod for validation

---

### 3. Charting/Visualization Libraries

#### 3.1 Recharts (RECOMMENDED)
- **URL**: https://recharts.org/
- **GitHub**: https://github.com/recharts/recharts
- **Stars**: 24,000+
- **License**: MIT
- **Last Updated**: Active

**Why Recommended**:
| Criterion | Assessment |
|-----------|------------|
| License | MIT |
| React Integration | Built specifically for React |
| Declarative API | Composable components |
| Customization | Highly flexible |
| Documentation | Good with examples |

**Comparison with Chart.js**:
| Feature | Recharts | react-chartjs-2 |
|---------|----------|-----------------|
| React-native | Yes | Wrapper |
| Bundle Size | Larger (~150KB) | Smaller (~11KB core) |
| Customization | More flexible | More constrained |
| Learning Curve | Gentler | Steeper |
| Performance | Good for <1000 points | Better for large datasets |

**Our Needs**: Simple bar charts for cost comparison, pie charts for breakdown
- Dataset size: 7 providers max - Recharts handles this easily
- Need: High customization for branded look

**Decision**: **ADOPT** Recharts for cost visualizations

---

#### 3.2 Alternative Considered: Chart.js / react-chartjs-2
- Smaller bundle but less React-native
- Would work but Recharts better fits our React-first architecture
- **Decision**: **REJECT** in favor of Recharts

---

### 4. Pricing Table Components

#### 4.1 react-pricing-table (gergely-nagy/react-pricing-table)
- **URL**: https://github.com/gergely-nagy/react-pricing-table
- **Stars**: ~150
- **License**: MIT
- **Last Updated**: 2022 (stale)

**Assessment**:
- Designed for SaaS pricing tiers, not cost comparison
- Not maintained
- **Decision**: **REJECT** - Build custom with shadcn/ui Table component

---

### 5. Data Grid Libraries

#### 5.1 TanStack Table (CONSIDERED)
- **URL**: https://tanstack.com/table/
- **GitHub**: https://github.com/TanStack/table
- **Stars**: 25,000+
- **License**: MIT
- **Last Updated**: Active

**Assessment**:
- Powerful headless table library
- Great for complex sorting/filtering
- May be overkill for our 7-provider comparison
- **Decision**: **DEFER** - Start with shadcn/ui Table, adopt if needed

---

## Decisions Summary

### Libraries to ADOPT

| Library | Purpose | Version | License |
|---------|---------|---------|---------|
| **shadcn/ui** | UI Components | Latest | MIT |
| **React Hook Form** | Form State | ^7.71.0 | MIT |
| **Zod** | Validation | ^3.23.0 | MIT |
| **@hookform/resolvers** | Zod + RHF Integration | ^3.9.0 | MIT |
| **Recharts** | Cost Visualizations | ^2.15.0 | MIT |

### Libraries to DEFER (Evaluate Later)

| Library | Purpose | When to Evaluate |
|---------|---------|------------------|
| TanStack Table | Complex data grids | If sorting/filtering needs grow |
| Framer Motion | Animations | Phase 2 for enhanced UX |

### What We Build Custom

| Component | Reason |
|-----------|--------|
| GPU Cost Calculator Logic | Core business logic, unique to our product |
| Provider Comparison Cards | Custom design for our comparison UX |
| Pricing Data Schema | Specific to GPU/ML workloads |
| Training/Inference Calculators | Core differentiation |

---

## Package.json Updates

Based on this research, add to dependencies:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.71.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.15.0"
  }
}
```

shadcn/ui components are copy-pasted, not npm installed. Run:
```bash
npx shadcn@latest init
npx shadcn@latest add button input select tabs card table tooltip accordion
```

---

## Consequences

### Positive
- All selected libraries are MIT licensed (no legal concerns)
- All are actively maintained (reduced maintenance risk)
- Combined bundle impact: ~180KB additional (acceptable for calculator app)
- Strong community support for debugging/learning
- Type-safe development with Zod + TypeScript
- Accessible UI out of the box with shadcn/ui

### Negative
- Recharts is larger than Chart.js (but better React integration)
- Multiple dependencies to keep updated
- Learning curve for team unfamiliar with these libraries

### Risks Mitigated
- No abandoned libraries selected
- No copyleft licenses that could affect distribution
- All libraries have >10K weekly downloads (proven stability)

---

## References

### Libraries
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Recharts Documentation](https://recharts.org/)
- [TanStack Table Documentation](https://tanstack.com/table/)

### Research Sources
- [Best React Chart Libraries 2025 - LogRocket](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [shadcn/ui GitHub](https://github.com/shadcn-ui/ui)
- [React Hook Form NPM](https://www.npmjs.com/package/react-hook-form)

### Existing Solutions Reviewed
- [Infracost](https://github.com/infracost/infracost) - Terraform cost estimation (Apache 2.0)
- [Cloud Compare App](https://github.com/Notover1008/cloud-compare-app) - General cloud comparison (MIT)
