# Converting Prototype to Full Product

## When to Convert

After CEO approves a prototype at the `CHECKPOINT-PROTOTYPE` decision point, you can convert it to a full product.

## Conversion Process

The Orchestrator will guide this process when CEO says: **"Approve for full development"**

### Step 1: Archive Prototype

```bash
# Tag the prototype version
git tag -a prototype/{PRODUCT}/v0.1.0 -m "Prototype approved by CEO"

# Create prototype branch for reference
git branch archive/prototype-{PRODUCT} HEAD
```

### Step 2: Generate Full Product Artifacts

The Orchestrator spawns agents to create missing artifacts:

#### Product Manager
- Expand CONCEPT.md → Full PRD.md
- Add user stories with acceptance criteria
- Define non-functional requirements
- Document success metrics

#### Architect
- Expand tech decisions → Full architecture.md
- Create additional ADRs (at least 2 more)
- Define API contracts (if backend needed)
- Design database schema (if needed)
- Add security considerations

#### Backend Engineer (if needed)
- Setup API foundation
- Database migrations
- Middleware and error handling

#### Frontend Engineer
- Refactor prototype code for production
- Add proper error handling
- Implement loading states
- Add proper validation
- Improve styling (from utility classes to components)

#### QA Engineer
- Create full E2E test suite
- Add integration tests
- Run full testing gate
- Generate test coverage report

#### DevOps Engineer
- Setup CI/CD pipeline
- Configure deployment environments
- Add monitoring and logging

#### Technical Writer
- Create README
- Write API documentation
- Create development guide
- Document deployment process

### Step 3: Testing Gate

Run full testing gate before CEO final review:
- All unit tests
- All integration tests
- All E2E tests
- Visual verification
- Accessibility testing
- Performance testing

### Step 4: CEO Final Approval

Present production-ready version for final approval.

## Timeline Comparison

| Phase | Prototype | Full Product | Total |
|-------|-----------|--------------|-------|
| Concept/PRD | 30 min | +90 min | 2 hours |
| Tech/Architecture | 20 min | +160 min | 3 hours |
| Build | 2 hours | +4 hours | 6 hours |
| Testing | 15 min | +60 min | 75 min |
| **Total** | **~3 hours** | **+6-8 hours** | **~10-12 hours** |

**Key Insight**: Prototype (3 hours) + Conversion (6-8 hours) = ~10-12 hours total, which is still faster than starting with full new-product workflow (~15 hours) because you validate the concept first.

## Orchestrator Commands

### To Start Prototype
```
/orchestrator Prototype: [idea description]
```

### After CEO Approves Prototype
```
/orchestrator Convert [product] to full product
```

### If CEO Wants Iterations
```
/orchestrator Iterate prototype [product]: [changes requested]
```

### If CEO Abandons Concept
```
/orchestrator Archive prototype [product]
```

## Example Flow

**CEO**: "Prototype: Real-time chat app for team collaboration"

**Orchestrator**: Creates prototype-first task graph
- 30 min: Concept doc (chat rooms, messages, user list)
- 20 min: Tech choice (Vite + React + WebSocket mock)
- 2 hours: Build prototype with 3 features
- 15 min: Smoke test
- **Total: 3 hours**

**Checkpoint**: CEO tests prototype

**CEO**: "Approve for full development"

**Orchestrator**: Converts to full product
- Expands to full PRD with user stories
- Creates full architecture with real WebSocket backend
- Adds authentication, persistence, error handling
- Creates full test suite
- **Additional: 6-8 hours**

**Result**: Production-ready chat app in ~10-12 hours total, with concept validated early.

## Benefits

1. **Early Validation**: See if concept works before full investment
2. **Faster Pivots**: Can abandon or change direction after 3 hours vs 15 hours
3. **Better Decisions**: CEO makes informed choice after seeing working prototype
4. **Reduced Waste**: Don't build full product for concepts that don't work
5. **Incremental Investment**: Small bet first, then full investment

## When to Use Each Workflow

### Use Prototype-First When:
- ✅ Testing a new, unproven concept
- ✅ Unsure if idea is worth full investment
- ✅ Want to experiment quickly
- ✅ Need to show stakeholders before committing
- ✅ Exploring different approaches

### Use New-Product Directly When:
- ✅ Concept is already validated
- ✅ Clear requirements from start
- ✅ Similar to existing successful products
- ✅ Need production quality immediately
- ✅ No uncertainty about approach
