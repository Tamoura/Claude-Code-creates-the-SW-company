# Port Registry

**Purpose**: one product, one pair of ports. Article VII makes this binding so
that several products can run at once without a port fight.

## Allocation rules

| Range | Use |
|-------|-----|
| 3100–3199 | Frontend (web) dev servers |
| 5000–5099 | Backend (API) servers |
| 8081–8099 | Mobile dev servers |
| Databases | Docker with a unique container name; publish a non-default host port |

Claim the next free number in the range, add the row below in the same commit
as the product, and never reuse a number that appears in git history for a
different product.

## Registered ports

### Frontend (3100–3199)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 3100 | taskflow | Demo | http://localhost:3100 |

### Backend (5000–5099)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 5000 | taskflow | Demo | http://localhost:5000 |

### Databases

| Host port | Container | Product |
|-----------|-----------|---------|
| 5433 | `taskflow-postgres` | taskflow |

## Checking before you claim

```bash
lsof -i :3101            # is anything already listening?
grep -r "3101" .claude/PORT-REGISTRY.md
```
