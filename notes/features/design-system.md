# Design System Feature Notes

## Branch
`feature/connectin/design-system`

## Scope
Create four design documents for ConnectIn:
1. DESIGN-SYSTEM.md -- Complete design system spec (colors, typography, spacing, components, RTL, dark mode)
2. WIREFRAMES.md -- ASCII/Mermaid wireframes for all 11 MVP pages (mobile + desktop)
3. ACCESSIBILITY.md -- WCAG 2.1 AA compliance spec
4. COMPONENT-SPECS.md -- Detailed component specs for frontend engineer handoff

## Key Decisions
- Arabic-first: all components RTL-native, LTR is the adaptation
- CSS Logical Properties exclusively (no physical left/right)
- IBM Plex Arabic + Inter as font families
- Professional blue/teal primary palette (#0C6E8C area)
- shadcn/ui as component base, extended for RTL and bilingual
- 8px grid system
- Lucide icon set
- WCAG 2.1 AA: 4.5:1 contrast ratio minimum for normal text

## Input Documents Read
- PRD.md: 42 user stories, 4 personas, 10 epics, data model, API contracts
- INNOVATION-BRIEF.md: Arabic-first design philosophy, AI features, tech stack
- addendum.md: 40 routes site map, business logic rules, tech stack confirmation
