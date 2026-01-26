# Branch Strategy for ConnectSW

**Updated**: 2026-01-26  
**Purpose**: Define branch organization for SW agents infrastructure and products

---

## Branch Structure

### 1. SW Agents Infrastructure Branch
**Branch**: `feature/sw-agents-infrastructure`

**Contains**:
- `.claude/` - All agent infrastructure, utilities, and configurations
- `.github/` - CI/CD workflows and Dependabot configuration
- `docs/` - Company-wide documentation (not product-specific)
- `infrastructure/` - Infrastructure as Code
- `shared/` - Cross-product shared code

**Purpose**: 
- SW agent system improvements
- Infrastructure enhancements
- Company-wide tooling
- Documentation updates

**Examples**:
- Adding new quality gates
- Implementing new agent utilities
- Updating orchestrator logic
- Adding monitoring tools

---

### 2. Product Feature Branches
**Pattern**: `feature/[product-name]/[feature-name]`

**Contains**:
- `products/[product-name]/` - Product-specific code
- Product-specific documentation in `products/[product-name]/docs/`

**Purpose**:
- Product-specific features
- Product bug fixes
- Product enhancements

**Examples**:
- `feature/gpu-calculator/core-features`
- `feature/it4it-dashboard/r2d`
- `feature/tech-management-helper/authentication`

---

## Branch Naming Conventions

### SW Agents Infrastructure
```
feature/sw-agents-infrastructure
feature/sw-agents/[feature-name]
```

### Products
```
feature/[product-name]/[feature-name]
fix/[product-name]/[bug-description]
arch/[product-name]
foundation/[product-name]
```

---

## Workflow

### Working on SW Agents Infrastructure

```bash
# Start from main
git checkout main
git pull

# Create feature branch
git checkout -b feature/sw-agents/[feature-name]

# Make changes to .claude/, docs/, etc.
# Commit and push
git add .claude/ docs/
git commit -m "feat(sw-agents): [description]"
git push -u origin feature/sw-agents/[feature-name]
```

### Working on Product Features

```bash
# Start from main
git checkout main
git pull

# Create product feature branch
git checkout -b feature/[product-name]/[feature-name]

# Make changes to products/[product-name]/
# Commit and push
git add products/[product-name]/
git commit -m "feat([product-name]): [description]"
git push -u origin feature/[product-name]/[feature-name]
```

---

## Current Branches

### SW Agents Infrastructure
- `feature/sw-agents-infrastructure` - Main infrastructure branch

### Products
- `feature/gpu-calculator/core-features` - GPU Calculator features
- `feature/it4it-dashboard/r2d` - IT4IT Dashboard R2D value stream
- `feature/tech-management-helper/authentication` - Tech Management Helper auth
- `feature/tech-management-helper/risk-management` - Tech Management Helper risks

---

## Merging Strategy

### SW Agents Infrastructure
- Merge to `main` when stable
- Can be merged independently of products
- Products will pull latest infrastructure on next update

### Products
- Merge to `main` when feature complete
- Can reference SW agents infrastructure from main
- Product branches are independent

---

## Best Practices

1. **Keep branches focused**: One branch = one feature/improvement
2. **SW agents changes**: Use `feature/sw-agents-infrastructure` or `feature/sw-agents/[name]`
3. **Product changes**: Use `feature/[product]/[feature]`
4. **Regular updates**: Pull latest `main` before creating new branches
5. **Clean merges**: Keep commits focused and well-described

---

## Examples

### Adding a new quality gate (SW Agents)
```bash
git checkout main
git checkout -b feature/sw-agents/new-quality-gate
# Edit .claude/quality-gates/
git commit -m "feat(sw-agents): add new quality gate"
git push
```

### Adding a feature to GPU Calculator (Product)
```bash
git checkout main
git checkout -b feature/gpu-calculator/dark-mode
# Edit products/gpu-calculator/
git commit -m "feat(gpu-calculator): add dark mode"
git push
```

---

## Migration Notes

**Previous Structure**:
- Everything was in `feature/gpu-calculator-core-features`

**New Structure**:
- SW agents infrastructure → `feature/sw-agents-infrastructure`
- GPU Calculator features → `feature/gpu-calculator/core-features` (reset to product-only)

**Action Required**:
- SW agents work should use `feature/sw-agents-infrastructure`
- Product work should use product-specific branches
