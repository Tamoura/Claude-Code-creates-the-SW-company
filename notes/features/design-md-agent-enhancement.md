# DESIGN.md Agent Enhancement

## Summary
Enhanced UI/UX Designer, Frontend Engineer, and Tailwind Expert agents with comprehensive design system knowledge based on the [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) repository (60+ real-world design systems).

## Changes Made

### New Protocol: `.claude/protocols/design-md.md`
- Defines the DESIGN.md methodology — every product needs a DESIGN.md file
- 9 mandatory sections (Visual Theme, Color Palette, Typography, Components, Layout, Depth, Do's/Don'ts, Responsive, Agent Prompt Guide)
- 5 design archetypes (Warm Minimalist, Dark Precision, Clean Enterprise, Developer Playful, Luxury Product)
- Design token extraction guide with Tailwind config patterns
- Quality checklist for DESIGN.md files

### Updated: UI/UX Designer Agent (`.claude/agents/ui-ux-designer.md`)
- Added DESIGN.md section as MANDATORY first responsibility
- Added design archetypes table with real-world examples
- Enhanced "Design Systems" section with modern design intelligence (typography, color, depth, spacing, components)
- Added comprehensive real-world design reference library (backgrounds, typography strategies, shadows, radii, hover patterns)
- Updated handoff section to center around DESIGN.md
- Updated deliverables to list DESIGN.md as primary deliverable

### Updated: UI/UX Designer Brief (`.claude/agents/briefs/ui-ux-designer.md`)
- DESIGN.md first rule added
- Design archetypes quick reference table
- Key design intelligence summary (typography, color, depth, spacing, components)
- DESIGN.md compliance added to quality gate
- Updated workflow to include DESIGN.md creation step

### Updated: Frontend Engineer Agent (`.claude/agents/frontend-engineer.md`)
- Added DESIGN.md consumption section (read before ANY UI work)
- Typography implementation rules with real-world patterns
- Tailwind custom utilities pattern for letter-spacing/line-height
- Updated responsibilities to reference DESIGN.md

### Updated: Frontend Engineer Brief (`.claude/agents/briefs/frontend-engineer.md`)
- DESIGN.md source of truth section
- Typography implementation rules
- DESIGN.md compliance in quality gate
- Updated workflow to start with DESIGN.md reading

### Updated: Tailwind Expert Agent (`.claude/agents/tailwind-expert.md`)
- DESIGN.md integration section
- CSS variables → Tailwind config pattern
- Advanced typography utilities with fontSize compound syntax
- Shadow strategies by archetype (warm-tinted, ring-shadow, border-based, frosted glass)
- Component radius decision tree
- Hover & interaction custom utilities
- OpenType features in Tailwind
- Updated ConnectSW-specific guidance

### Updated: `.claude/CLAUDE.md`
- Added `design-md.md` protocol to Protocol Library table

## Key Patterns from awesome-design-md

### Typography (MOST impactful)
- Letter-spacing scales inversely with size: -3px at 96px, 0 at 16px
- Line-height compresses: 1.05 for display, 1.60 for body
- Weight restraint: 2-3 weights max per product

### Color
- Brand color rationed to CTAs only
- Warm near-blacks (#1c1c1e) instead of pure #000
- Opacity-based neutral scales

### Depth
- Choose ONE strategy: shadows, borders, ring-shadows, or flat

### Spacing
- 8px grid standard
- 80-120px section spacing for premium feel
