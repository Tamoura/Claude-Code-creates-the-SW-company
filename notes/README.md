# Notes Directory

CEO briefs, strategy documents, advisory content, and research organized by category.

**Agents**: Check the relevant subfolder before generating plans — prior decisions and research may already exist here.

---

## Structure

```
notes/
├── ceo/          # CEO briefs, directives, and decisions
├── strategy/     # Company strategy, roadmaps, market positioning
├── features/     # Feature briefs and CEO-level feature descriptions
├── advisory/     # Advisory board input, mentor guidance, investor notes
├── research/     # Technical and market research
├── innovation/   # R&D ideas, emerging tech explorations
└── archived/     # Deprecated or superseded notes
```

## Directory Guide

### `ceo/`
CEO-level briefs and decisions that drive Orchestrator work. When the CEO says "New product: X" or "Fix Y", the Orchestrator saves the brief here before delegating.

- `new-product-[name].md` — Initial CEO brief for new product
- `decision-[topic]-[date].md` — One-off CEO decisions
- `priorities-[quarter].md` — Quarterly priority setting

### `features/`
Feature-level briefs before spec-kit processing. The Orchestrator saves the raw CEO request here; the Product Manager uses it as input to `/speckit.specify`.

- `[product]-[feature-name].md`

### `strategy/`
Company-wide strategy. Updated by the Product Strategist or CEO directly.

- `roadmap.md` — Overall company roadmap
- `[product]-strategy.md` — Per-product strategy notes

### `advisory/`
Input from advisors, investors, domain experts. Often informs Business Analysis or Product Strategy.

### `research/`
Technical research, competitive analyses, feasibility studies. Used by Innovation Specialist and Business Analyst.

### `innovation/`
R&D explorations. Ideas that are not yet products. May graduate to `ceo/` briefs when validated.

### `archived/`
Notes that are no longer current. Move here rather than deleting — historical context has value.

---

## How Agents Use This Directory

| Agent | When to look here |
|-------|------------------|
| Business Analyst | Before BA-01 report — check `research/` and `advisory/` for context |
| Product Manager | Before `/speckit.specify` — check `features/` and `ceo/` for the brief |
| Product Strategist | Before market analysis — check `strategy/` and `research/` |
| Innovation Specialist | Before R&D work — check `innovation/` for prior exploration |
| Orchestrator | When CEO gives a new request — save brief here first, then delegate |

---

*Keep notes concise. A brief is not a spec — specs live in `products/[product]/docs/specs/`.*
