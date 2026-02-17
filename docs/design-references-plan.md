# Frontend Design Reference Plan

## Research Summary

### Magic Patterns Evaluation

**What it is:** An AI-powered UI design platform that generates React/Tailwind CSS components from text prompts or screenshots. Used by 1,500+ product teams. Uses Claude models internally.

**Key Strengths:**
- Text-to-layout generation (describe a dashboard, get a full UI)
- Design system matching (upload your system, it respects your tokens/spacing/typography)
- Clean code export (React + Tailwind CSS + TypeScript)
- Chrome extension to capture UIs from any website
- Multiplayer canvas (Figma-like collaboration)
- Supports shadcn/ui, Radix Themes, Mantine, Chakra UI, Tailwind
- Reference-based generation (upload screenshots, PRDs, or paste links)
- 10,000+ community patterns as inspiration

**Limitations:**
- Paid tool ($19/mo individual, $75/mo teams)
- Captures at component level — manual assembly into full screens needed
- Not a replacement for a design system, more of an accelerator
- Generated code may need cleanup for production standards

**Fit with ConnectSW:**
- Stack match: React + Tailwind CSS + shadcn/ui — direct alignment
- Can import our `@connectsw/ui` design system for consistent generation
- Useful for rapid prototyping during the wireframe/mockup phase

### Alternatives Evaluated

| Tool | Type | Strengths | Pricing | Stack Fit |
|------|------|-----------|---------|-----------|
| **Magic Patterns** | AI design platform | Text-to-UI, design system import, code export | $19-75/mo | Excellent (React+Tailwind+shadcn) |
| **shadcn/ui** | Component library | Copy-paste ownership, Radix primitives, full control | Free | Already in use |
| **Tailwind Plus (Catalyst)** | Official component kit | 500+ components by Tailwind team, Next.js templates | $299 one-time | Excellent |
| **v0 by Vercel** | AI code generator | shadcn/ui native, generates full React components | Free tier available | Excellent (Next.js native) |
| **Flowbite** | Component library | Open-source, Figma design system, dark mode | Free + Pro | Good |
| **Subframe** | AI design platform | Visual design + code export, deterministic output | Paid | Good |
| **Radix UI + Headless UI** | Unstyled primitives | Maximum customization, accessibility built-in | Free | Already partially used via shadcn |

### Recommendation

**Primary reference: Magic Patterns** — for rapid prototyping and design exploration
**Complementary references:**
1. **Tailwind Plus / Catalyst** — for production-quality component patterns and layout templates
2. **v0 by Vercel** — for quick shadcn/ui component generation (free, Next.js native)

This gives ConnectSW a three-tier design reference system:
- **Exploration:** Magic Patterns (AI-generated layouts from prompts)
- **Component patterns:** Tailwind Plus (professionally designed, production-tested)
- **Quick generation:** v0 (free, generates shadcn/ui code directly)

---

## Implementation Plan

### What will be created/updated

#### 1. New file: `.claude/DESIGN-REFERENCES.md`
A centralized design reference guide for all ConnectSW agents (especially UI/UX Designer and Frontend Engineer) containing:

- **Approved design reference tools** with usage guidelines
- **When to use each tool** (exploration vs. component patterns vs. quick generation)
- **How to integrate outputs** with the existing `@connectsw/ui` library
- **Quality checklist** for AI-generated designs (accessibility, dark mode, responsive)
- **Community pattern links** — curated Magic Patterns gallery entries relevant to our products (dashboards, forms, data tables, etc.)

#### 2. Update: `.claude/agents/ui-ux-designer.md`
Add a new "Design References" section in the workflow that directs the agent to:
- Consult `DESIGN-REFERENCES.md` before starting mockups
- Use Magic Patterns for rapid prototyping of new features
- Cross-reference Tailwind Plus for production component patterns
- Use v0 for quick shadcn/ui component scaffolding

#### 3. Update: `.claude/agents/briefs/ui-ux-designer.md`
Add design reference tools to the Tech Stack section and update the Research workflow step.

#### 4. Update: `.claude/COMPONENT-REGISTRY.md`
Add a "Design Reference Tools" section linking to the new guide, so any agent building UI knows these resources exist.

### What will NOT change
- No code changes to `@connectsw/ui` or any product
- No new dependencies or packages installed
- No changes to existing Tailwind configurations
- No changes to the design system tokens/colors/typography

### Files affected
```
.claude/DESIGN-REFERENCES.md          (NEW)
.claude/agents/ui-ux-designer.md       (UPDATE - add references section)
.claude/agents/briefs/ui-ux-designer.md (UPDATE - add to tech stack)
.claude/COMPONENT-REGISTRY.md          (UPDATE - add reference link)
```

### Estimated scope
4 file changes (1 new, 3 updates). Documentation only — no code changes, no risk to existing functionality.
