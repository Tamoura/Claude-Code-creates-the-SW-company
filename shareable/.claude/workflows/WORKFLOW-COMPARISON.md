# ConnectSW Workflow Comparison Guide

## Overview

ConnectSW offers two primary workflows for creating new products:

1. **Prototype-First** - Fast concept validation (3 hours)
2. **New Product** - Complete production-ready development (15 hours)

---

## Quick Decision Tree

```
New Idea
    │
    ├─ Is concept proven/validated?
    │   ├─ YES → Use "New Product" workflow
    │   └─ NO → Use "Prototype-First" workflow
    │
    ├─ Need to experiment?
    │   └─ YES → Use "Prototype-First" workflow
    │
    ├─ Similar to existing products?
    │   └─ YES → Use "New Product" workflow
    │
    └─ Tight deadline for demo?
        └─ YES → Use "Prototype-First" workflow
```

---

## Prototype-First Workflow

### When to Use
- ✅ Testing a new, unproven concept
- ✅ Unsure if idea is worth full investment
- ✅ Want to show stakeholders before committing
- ✅ Need quick demo or proof-of-concept
- ✅ Exploring different approaches
- ✅ Low risk tolerance - want to validate first

### Timeline: ~3 Hours

```
Hour 0:00 ─ CONCEPT-01 (30 min)
            │ Quick concept document
            │ 3-5 key features only
            │ Success criteria
            │
Hour 0:30 ─ TECH-01 (20 min)
            │ Fast tech stack choice
            │ 1 ADR only
            │ Optimize for speed
            │
Hour 0:50 ─ PROTO-01 (2 hours)
            │ Build working prototype
            │ Hardcoded data
            │ Minimal styling
            │ Happy path only
            │ ~10 tests
            │
Hour 2:50 ─ TEST-01 (15 min)
            │ Smoke test
            │ Basic validation
            │
Hour 3:05 ─ CHECKPOINT
            │ CEO tests prototype
            │ Decision:
            │  ├─ Approve → Convert to full product (+6-8 hours)
            │  ├─ Iterate → Make changes and rebuild
            │  └─ Abandon → Move on
```

### What You Get
- Working prototype with 3-5 features
- Can click through and test concept
- Minimal documentation (concept doc + 1 ADR)
- ~10 basic tests
- NOT production-ready (hardcoded data, no edge cases)

### Example CEO Request
```
/orchestrator Prototype: Todo list app with drag-and-drop prioritization
/orchestrator Prototype: Real-time collaborative whiteboard
/orchestrator Prototype: AI-powered recipe generator
```

### After Approval
```
/orchestrator Convert todo-list to full product
```
**Additional Time**: 6-8 hours to make production-ready

---

## New Product Workflow

### When to Use
- ✅ Concept is already validated
- ✅ Clear requirements from start
- ✅ Similar to existing successful products
- ✅ Need production quality immediately
- ✅ Building for real users from day one
- ✅ No uncertainty about approach

### Timeline: ~15 Hours

```
Hour 0 ───── PRD-01 (2 hours)
             │ Full Product Requirements Doc
             │ User personas and stories
             │ Success metrics
             │ Non-functional requirements
             │
Hour 2 ───── ARCH-01 (3 hours)
             │ Complete architecture
             │ Multiple ADRs (3+)
             │ API contracts
             │ Database schema
             │ Security considerations
             │
Hour 5 ───── DEVOPS-01 (1.5 hours, parallel)
             │ CI/CD pipeline
             │ Docker configuration
             │ Environment setup
             │
         ┌── BACKEND-01 (2.5 hours, parallel)
         │   │ API foundation
         │   │ Database setup
         │   │ Middleware
         │   │ 10+ tests
         │   │
Hour 5 ─┼── FRONTEND-01 (2 hours, parallel)
         │   │ Complete UI
         │   │ All components
         │   │ Proper styling
         │   │ 5+ tests
         │   │
         └── Can run these in parallel (save 4 hours)
             │
Hour 9 ───── QA-01 (1 hour)
             │ E2E test framework
             │ Test utilities
             │ Smoke tests
             │
Hour 10 ──── QA-02 (1 hour)
             │ Full testing gate
             │ Unit + E2E tests
             │ Visual verification
             │ Generate report
             │
Hour 11 ──── DOCS-01 (1 hour, parallel with above)
             │ README
             │ API docs
             │ Development guide
             │
Hour 12 ──── CHECKPOINT
             │ CEO review
             │ Production-ready
```

### What You Get
- Production-ready application
- Complete documentation (PRD, architecture, multiple ADRs)
- Full test suite (50+ tests typical)
- CI/CD pipeline configured
- Proper error handling and edge cases
- Ready to deploy to production

### Example CEO Request
```
/orchestrator New product: Customer support ticket system
/orchestrator New product: E-commerce store for handmade goods
/orchestrator New product: Team collaboration workspace
```

---

## Side-by-Side Comparison

| Aspect | Prototype-First | New Product |
|--------|----------------|-------------|
| **Time** | ~3 hours | ~15 hours |
| **Documentation** | Concept doc + 1 ADR | Full PRD + Architecture + 3+ ADRs |
| **Features** | 3-5 key features only | All MVP features (7-12) |
| **Tests** | ~10 basic tests | 50+ comprehensive tests |
| **Code Quality** | Quick & dirty (hardcoded) | Production-ready (proper) |
| **Error Handling** | Happy path only | Full error handling |
| **Styling** | Utility classes only | Proper component styling |
| **Data** | Hardcoded/mocked | Database or proper state |
| **CI/CD** | None | Full pipeline |
| **Backend** | Usually none | If needed, fully built |
| **Deployment** | Not production-ready | Ready to deploy |
| **Use Case** | Validate concept | Ship to users |

---

## Cost Comparison

### Scenario 1: Concept That Doesn't Validate

**Prototype-First**:
- Time: 3 hours
- Result: Learned concept doesn't work
- **Total Cost**: 3 hours ✅

**New Product**:
- Time: 15 hours
- Result: Built full product for bad concept
- **Total Cost**: 15 hours ❌
- **Waste**: 12 hours

**Savings**: 12 hours (80%)

---

### Scenario 2: Concept That Validates

**Prototype-First → Conversion**:
- Prototype: 3 hours
- CEO approval: Validated!
- Conversion to full: 6-8 hours
- **Total Cost**: 10-12 hours ✅

**New Product (Direct)**:
- Full development: 15 hours
- **Total Cost**: 15 hours ⚠️

**Difference**: 3-5 hours saved, plus reduced risk

---

### Scenario 3: Multiple Concept Exploration

**Testing 3 concepts to find 1 winner:**

**Prototype-First**:
- Prototype A: 3 hours → Abandon
- Prototype B: 3 hours → Abandon
- Prototype C: 3 hours → Approve → Convert (8 hours)
- **Total**: 17 hours for 1 successful product

**New Product**:
- Product A: 15 hours → Abandon
- Product B: 15 hours → Abandon
- Product C: 15 hours → Success
- **Total**: 45 hours for 1 successful product

**Savings**: 28 hours (62%)

---

## Conversion Process

When CEO approves a prototype:

```
CEO: "Approve for full development"
    ↓
Orchestrator converts prototype to full product:
    ├─ Expand concept → Full PRD (+1.5 hours)
    ├─ Create full architecture (+2.5 hours)
    ├─ Refactor code for production (+3 hours)
    ├─ Add comprehensive tests (+1 hour)
    ├─ Create CI/CD pipeline (+1 hour)
    └─ Full documentation (+1 hour)
    ↓
Total additional time: ~6-8 hours
    ↓
Result: Production-ready product
```

**Total time**: 3 (prototype) + 6-8 (conversion) = **10-12 hours**

Still faster than 15 hours from scratch, with validated concept!

---

## Real Examples

### Example 1: Basic Calculator (Actual)
**What we did**: New Product workflow (direct)
- Time: ~5 hours (faster than estimate due to simplicity)
- Result: Production-ready calculator
- **Why this was right**: Simple, well-understood concept. No validation needed.

**If we had used Prototype-First**:
- Would have added unnecessary steps
- Concept was already clear

---

### Example 2: AI Chat Interface (Hypothetical)
**Better approach**: Prototype-First
- Hour 0-3: Build quick prototype with OpenAI API
- CEO tests it: "Responses are too slow"
- Decision: Abandon or pivot to different AI model
- **Saved**: 12 hours of building full product for flawed concept

---

### Example 3: Team Dashboard (Hypothetical)
**Better approach**: Prototype-First
- Hour 0-3: Build prototype with 3 widgets
- CEO tests it: "Love it! But need 5 more widgets"
- Decision: Approve for full development
- Hour 3-11: Add remaining widgets, tests, production features
- **Total**: 11 hours vs 15 hours direct

---

## Best Practices

### For Prototype-First
1. **Keep it minimal** - Resist adding "one more feature"
2. **Hardcode everything** - Data, users, settings - all fake
3. **Skip edge cases** - Only happy path
4. **Use utility CSS** - No custom components yet
5. **Time box strictly** - Stop at 2 hours for build phase

### For New Product
1. **Clear requirements first** - Don't start without solid understanding
2. **Proper TDD** - Write tests before code
3. **Think about edge cases** - Handle errors properly
4. **Reusable components** - Build for maintainability
5. **Document as you go** - ADRs, README, API docs

---

## Orchestrator Commands

### Start Prototype
```
/orchestrator Prototype: [idea description]
```

### Start Full Product
```
/orchestrator New product: [idea description]
```

### After Prototype Approved
```
/orchestrator Convert [product-name] to full product
```

### Iterate Prototype
```
/orchestrator Iterate prototype [product-name]: [changes]
```

### Abandon Prototype
```
/orchestrator Archive prototype [product-name]
```

---

## Summary

**Use Prototype-First when**:
- 🤔 Not sure if concept will work
- 🎯 Want to validate before investing
- ⚡ Need quick demo
- 🔄 Exploring multiple approaches

**Use New Product when**:
- ✅ Concept is proven
- 📋 Requirements are clear
- 🚀 Need production quality now
- 👥 Building for real users immediately

**Key Insight**: Prototype-First reduces risk and waste. Use it for uncertain concepts. Convert successful prototypes to full products. You'll save time and build better products.
