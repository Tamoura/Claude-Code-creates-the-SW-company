# ConnectSW Product Manuals Index

**Last Updated**: 2026-01-28
**Purpose**: Quick reference to all product manuals

---

## Product Manuals

All product manuals are located in their respective product folders under `products/[product-name]/docs/`.

### Stablecoin Gateway
A payment platform for accepting stablecoin payments (USDC/USDT) with 0.5% fees.

- [User Manual](../../products/stablecoin-gateway/docs/stablecoin-gateway-user-manual.md)
- [Technical Manual](../../products/stablecoin-gateway/docs/stablecoin-gateway-technical-manual.md)
- [PRD](../../products/stablecoin-gateway/docs/PRD.md)
- [Architecture](../../products/stablecoin-gateway/docs/architecture.md)
- [API Contract](../../products/stablecoin-gateway/docs/api-contract.yml)

**Status**: Production Ready
**Tech Stack**: Next.js, Fastify, PostgreSQL, Polygon/Ethereum
**Folder**: `products/stablecoin-gateway/`

---

### GPU Calculator
GPU cost calculator for AI/ML workloads with performance and pricing comparisons.

- [User Manual](../../products/gpu-calculator/docs/gpu-calculator-user-manual.md)
- [Technical Manual](../../products/gpu-calculator/docs/gpu-calculator-technical-manual.md)
- [PRD](../../products/gpu-calculator/docs/PRD.md)
- [Architecture](../../products/gpu-calculator/docs/architecture.md)

**Status**: Active Development
**Tech Stack**: Next.js, React, TypeScript
**Folder**: `products/gpu-calculator/`

---

### Basic Calculator
Simple web-based calculator with accessibility-first design.

- [User Manual](../../products/basic-calculator/docs/basic-calculator-user-manual.md)
- [Technical Manual](../../products/basic-calculator/docs/basic-calculator-technical-manual.md)
- [PRD](../../products/basic-calculator/docs/PRD.md)
- [Architecture](../../products/basic-calculator/docs/architecture.md)

**Status**: Complete
**Tech Stack**: Next.js, React, TypeScript, Tailwind CSS
**Folder**: `products/basic-calculator/`

---

### Tech Management Helper
Comprehensive tech management toolkit with ITIL/IT4IT framework support.

- [User Manual](../../products/tech-management-helper/docs/tech-management-helper-user-manual.md)
- [Technical Manual](../../products/tech-management-helper/docs/tech-management-helper-technical-manual.md)
- [PRD](../../products/tech-management-helper/docs/PRD.md)
- [Architecture](../../products/tech-management-helper/docs/architecture.md)

**Status**: v1.0.0 Released
**Tech Stack**: Next.js, Fastify, PostgreSQL
**Folder**: `products/tech-management-helper/`

---

### IT4IT Dashboard
IT4IT framework dashboard for IT value stream management.

- [User Manual](../../products/it4it-dashboard/docs/it4it-dashboard-user-manual.md)
- [Technical Manual](../../products/it4it-dashboard/docs/it4it-dashboard-technical-manual.md)
- [PRD](../../products/it4it-dashboard/docs/PRD.md)
- [Architecture](../../products/it4it-dashboard/docs/architecture.md)

**Status**: Active Development
**Tech Stack**: Next.js, React, TypeScript
**Folder**: `products/it4it-dashboard/`

---

### Quantum Computing Usecases
Quantum computing use cases and examples for various industries.

- [User Manual](../../products/quantum-computing-usecases/docs/quantum-computing-usecases-user-manual.md)
- [Technical Manual](../../products/quantum-computing-usecases/docs/quantum-computing-usecases-technical-manual.md)
- [PRD](../../products/quantum-computing-usecases/docs/PRD.md)

**Status**: Prototype
**Tech Stack**: Next.js, React
**Folder**: `products/quantum-computing-usecases/`

---

## Manual Types

### User Manuals
**Audience**: End users, product managers, business stakeholders

**Contents**:
- Product overview and value proposition
- Getting started guide (5-minute setup)
- Feature walkthroughs with examples
- Troubleshooting common issues
- FAQ

### Technical Manuals
**Audience**: Developers, architects, DevOps engineers

**Contents**:
- System architecture with diagrams
- Technology stack details
- How it works (technical flows)
- API documentation (if applicable)
- Database schema (if applicable)
- Deployment instructions
- Performance metrics
- Security architecture

---

## How to Use Product Documentation

### For Product Managers
Start with the **User Manual** to understand features, then review the **PRD** for detailed requirements.

### For Developers
Start with the **Technical Manual** to understand architecture, then review **Architecture.md** and **API Contract** for implementation details.

### For CEO
Read **User Manual** for product overview, **Technical Manual** for technical decisions, **PRD** for business requirements.

### For New Team Members
1. Read User Manual to understand what the product does
2. Read Technical Manual to understand how it works
3. Read PRD for business context
4. Explore product code in `products/[product]/`

---

## Contributing to Manuals

### When to Update Manuals

- After adding new features
- After architectural changes
- After deploying to production
- When fixing bugs that affect user experience
- When learning new patterns or best practices

### Manual Update Process

1. **Edit the manual** in `products/[product]/docs/[product]-[type]-manual.md`
2. **Update "Last Updated" date** at the top
3. **Increment version** if major changes
4. **Commit with message**: `docs([product]): update [user/technical] manual`

### Writing Guidelines

**User Manuals**:
- Use simple, clear language
- Avoid technical jargon
- Include screenshots/examples
- Focus on "what" and "why"
- Step-by-step instructions

**Technical Manuals**:
- Use precise technical language
- Include code examples
- Explain "how" and "why"
- Add architecture diagrams (ASCII art is fine)
- Document edge cases

---

## Quick Reference Table

| Product | User Manual | Technical Manual | PRD | Architecture | Status |
|---------|-------------|------------------|-----|--------------|--------|
| Stablecoin Gateway | [Link](../../products/stablecoin-gateway/docs/stablecoin-gateway-user-manual.md) | [Link](../../products/stablecoin-gateway/docs/stablecoin-gateway-technical-manual.md) | [Link](../../products/stablecoin-gateway/docs/PRD.md) | [Link](../../products/stablecoin-gateway/docs/architecture.md) | Production |
| GPU Calculator | [Link](../../products/gpu-calculator/docs/gpu-calculator-user-manual.md) | [Link](../../products/gpu-calculator/docs/gpu-calculator-technical-manual.md) | [Link](../../products/gpu-calculator/docs/PRD.md) | [Link](../../products/gpu-calculator/docs/architecture.md) | Development |
| Basic Calculator | [Link](../../products/basic-calculator/docs/basic-calculator-user-manual.md) | [Link](../../products/basic-calculator/docs/basic-calculator-technical-manual.md) | [Link](../../products/basic-calculator/docs/PRD.md) | [Link](../../products/basic-calculator/docs/architecture.md) | Complete |
| Tech Management Helper | [Link](../../products/tech-management-helper/docs/tech-management-helper-user-manual.md) | [Link](../../products/tech-management-helper/docs/tech-management-helper-technical-manual.md) | [Link](../../products/tech-management-helper/docs/PRD.md) | [Link](../../products/tech-management-helper/docs/architecture.md) | Released |
| IT4IT Dashboard | [Link](../../products/it4it-dashboard/docs/it4it-dashboard-user-manual.md) | [Link](../../products/it4it-dashboard/docs/it4it-dashboard-technical-manual.md) | [Link](../../products/it4it-dashboard/docs/PRD.md) | [Link](../../products/it4it-dashboard/docs/architecture.md) | Development |
| Quantum Computing | [Link](../../products/quantum-computing-usecases/docs/quantum-computing-usecases-user-manual.md) | [Link](../../products/quantum-computing-usecases/docs/quantum-computing-usecases-technical-manual.md) | [Link](../../products/quantum-computing-usecases/docs/PRD.md) | - | Prototype |

---

## Related Documentation

### Company Documentation
- [CEO Guide](../CEO-GUIDE.md) - How to use ConnectSW agents
- [Documentation Index](../DOCUMENTATION-INDEX.md) - All company docs
- [Architecture](../architecture/) - Company-wide architecture patterns

### Product Structure
Each product follows this standard structure:
```
products/[product]/
├── apps/               # Application code
├── docs/               # Product documentation
│   ├── PRD.md         # Product Requirements Document
│   ├── architecture.md # System architecture
│   ├── [product]-user-manual.md      # User manual
│   ├── [product]-technical-manual.md # Technical manual
│   ├── api-contract.yml              # API specification
│   ├── database-schema.md            # Database design
│   └── ADRs/          # Architecture Decision Records
├── packages/          # Shared code
└── README.md          # Quick start guide
```

---

**All product manuals are located in their respective product folders** - `products/[product]/docs/`

[Back to Documentation Index](../DOCUMENTATION-INDEX.md)
