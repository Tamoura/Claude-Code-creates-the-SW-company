# Quick Reference: Reusable Components

**For**: Architects designing new products
**See Full Guide**: `.claude/architecture/reusable-components.md`

## At-a-Glance Recommendations

| Component | First Choice ⭐ | Alternative 1 | Alternative 2 |
|-----------|----------------|---------------|---------------|
| **Auth** | Clerk | NextAuth.js | Auth0 |
| **Charts** | Recharts | Apache ECharts | Chart.js |
| **Payments** | Stripe | LemonSqueezy | Paddle |
| **API** | tRPC | REST | GraphQL |
| **Forms** | React Hook Form | TanStack Form | Formik |
| **UI** | shadcn/ui | Radix UI | Headless UI |

## Decision Trees (One-Minute)

### Authentication
```
TypeScript Next.js + Budget for managed?
  YES → Clerk ⭐
  NO → Need data ownership? → YES → NextAuth.js
                              NO → Clerk anyway (best DX)
```

### Charts
```
Data points per chart?
  < 100 → Recharts ⭐
  100-10K → Chart.js
  > 10K → Apache ECharts
```

### Payments
```
Need Merchant of Record (auto tax)?
  YES → Solo founder? → YES → LemonSqueezy
                        NO → Paddle
  NO → Stripe ⭐
```

### API
```
TypeScript monorepo (Next.js)?
  YES → tRPC ⭐
  NO → Public API? → YES → REST
                     NO → REST (safest default)
```

### Forms
```
Production app?
  YES → React Hook Form ⭐
  NO → Learning? → YES → Formik
                   NO → React Hook Form
```

### UI Components
```
Using Tailwind?
  YES → shadcn/ui ⭐
  NO → Want unstyled? → YES → Radix UI / Headless UI
                        NO → MUI (Material Design)
```

## Common Patterns

### Startup Stack (MVP in 2 weeks)
- **Auth**: Clerk (5 min setup)
- **Charts**: Recharts (simple)
- **Payments**: LemonSqueezy (no tax headaches)
- **API**: tRPC (fast development)
- **Forms**: React Hook Form (best performance)
- **UI**: shadcn/ui (beautiful + owned)

### Enterprise Stack (B2B SaaS)
- **Auth**: Auth0 (compliance)
- **Charts**: Apache ECharts (big data)
- **Payments**: Stripe (flexibility) or Paddle (MoR)
- **API**: REST (compatibility) or GraphQL (complex data)
- **Forms**: React Hook Form (production-ready)
- **UI**: Custom design system (shadcn/ui base)

### Budget-Conscious Stack
- **Auth**: NextAuth.js (free)
- **Charts**: Recharts (free)
- **Payments**: Stripe (lowest fees)
- **API**: REST (no overhead)
- **Forms**: React Hook Form (free)
- **UI**: shadcn/ui (free, no license)

## Critical Warnings

⚠️ **Radix UI**: Less actively maintained as of 2025 - consider Base UI or React Aria for new projects

⚠️ **GraphQL**: Performance can be 2x slower than REST for simple queries - only use if complexity justifies it

⚠️ **Auth0**: Pricing "growth penalty" can increase costs 15x when crossing tiers

⚠️ **LemonSqueezy**: 5% fees (vs 2.9% Stripe) - good for simplicity, expensive at scale

⚠️ **Formik**: Less active development, consider RHF or TanStack Form instead

## When to Deviate

Consider alternatives if:
- **Unique requirements**: Healthcare compliance, data residency laws
- **Scale constraints**: 1M+ users, petabytes of data
- **Existing infrastructure**: Already have auth/payment system
- **Team expertise**: Team has deep experience with alternative
- **Cost at scale**: Per-MAU pricing becomes prohibitive

**Always document why** in `.claude/memory/decision-log.json`

## Integration Time Estimates

| Component | Setup Time | First Feature | Production Ready |
|-----------|------------|---------------|------------------|
| Clerk | 5 min | 30 min | 2 hours |
| NextAuth.js | 1 hour | 3 hours | 8 hours |
| Recharts | 15 min | 1 hour | 2 hours |
| ECharts | 30 min | 2 hours | 4 hours |
| Stripe | 1 hour | 4 hours | 2 days |
| LemonSqueezy | 15 min | 1 hour | 2 hours |
| tRPC | 30 min | 1 hour | 3 hours |
| React Hook Form | 15 min | 30 min | 1 hour |
| shadcn/ui | 10 min | 30 min | 1 hour |

## Cost Estimates (1,000 users)

| Component | Free Tier | Paid (1K users) | Paid (10K users) |
|-----------|-----------|-----------------|------------------|
| Clerk | 10K MAUs | $0 | $25-50/mo |
| NextAuth.js | Unlimited | Infrastructure only | Infrastructure only |
| Auth0 | 7.5K MAUs | $240/mo | $850/mo |
| Stripe | Unlimited | ~$100 fees | ~$1,000 fees |
| LemonSqueezy | Unlimited | ~$150 fees | ~$1,500 fees |
| Paddle | Unlimited | ~$150 fees | ~$1,500 fees |

*Payment fees based on $3,000 monthly revenue at 1K users, $30,000 at 10K users*

## Must-Read Sections

Before choosing, read these sections in full guide:

- **Authentication**: Clerk vs NextAuth trade-offs, bundle size impact
- **Payments**: Merchant of Record vs Payment Facilitator explanation
- **API**: tRPC limitations (TypeScript-only), GraphQL performance
- **UI**: Radix maintenance concerns, shadcn ownership model

## Quick Start Commands

```bash
# Authentication (Clerk)
npm install @clerk/nextjs
npx clerk setup

# Charts (Recharts)
npm install recharts

# Payments (Stripe)
npm install stripe @stripe/stripe-js

# API (tRPC)
npm install @trpc/server @trpc/client @trpc/react-query

# Forms (React Hook Form)
npm install react-hook-form @hookform/resolvers zod

# UI (shadcn/ui)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button dialog form
```

## Next Steps

1. Read full component guide: `.claude/architecture/reusable-components.md`
2. Choose options for your product
3. Document decision: `.claude/memory/decision-log.json`
4. Create ADR: `products/[name]/docs/ADRs/XXX-technology-choices.md`
5. Update product README with tech stack
