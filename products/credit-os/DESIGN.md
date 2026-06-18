# DESIGN.md — Composable Credit OS (`credit-os`)

> Visual identity and design system for the Composable Credit OS platform.
> Single source of truth for all visual decisions. Frontend Engineer implements directly from this file.
>
> **Archetype**: Clean Enterprise (Stripe / IBM Carbon lineage) — white canvas, single accent, conservative radius, flat-to-subtle depth, density-first.

---

## 1. Visual Theme & Atmosphere

**Overall Feeling**: Calm, authoritative, trustworthy. A serious instrument for people who configure banking products and bear regulatory consequences. The interface recedes; data and structure lead.

**Design Philosophy**: *Configuration over code, clarity over decoration.* The product is metadata-driven and dense — tables, forms, dependency graphs, integrity reports, audit trails. The UI must make complex governed data legible, scannable, and safe to act on. Every pixel earns its place; nothing is decorative.

**Signature Traits**:
- White/near-white canvas with a single disciplined accent (Indigo) reserved for interactive elements only.
- Density-first layout — compact spacing, 4px micro-grid, no cinematic whitespace. This is a workbench, not a marketing site.
- Flat depth — borders and background luminance carry hierarchy; shadows only for true overlays (dropdowns, modals, popovers).
- Status is a first-class color system — draft / validating / valid / published / error / deprecated lifecycle states are visually distinct everywhere.
- Tabular numerals and monospace for IDs, versions, and config keys — alignment is non-negotiable in data-dense views.
- Channel-aware: the same system scales from internal power-user web down to a hardened, calmer customer self-service surface.

---

## 2. Color Palette & Roles

### Brand Colors
| Name | Hex | Role | Usage Rules |
|------|-----|------|-------------|
| Indigo 600 | `#4F46E5` | Primary brand / interactive | Primary CTAs, active nav, focus rings, links. Never a decorative fill. |
| Indigo 700 | `#4338CA` | Brand hover/active | Hover and pressed state of primary actions only. |
| Indigo 50 | `#EEF2FF` | Brand subtle | Selected-row tint, active tab background, info-light surfaces. |

### Semantic Colors
| Name | Hex | Role |
|------|-----|------|
| Success | `#047857` | Valid config, passed integrity checks, successful publication. |
| Success Light | `#ECFDF5` | Success badge/banner background. |
| Warning | `#B45309` | Caution — unresolved dependencies, pending review, draft-with-issues. |
| Warning Light | `#FFFBEB` | Warning badge/banner background. |
| Error | `#B91C1C` | Validation failures, destructive actions, integrity violations. |
| Error Light | `#FEF2F2` | Error badge/banner background, invalid input fill. |
| Info | `#1D4ED8` | Informational notices, neutral system messages. |
| Info Light | `#EFF6FF` | Info badge/banner background. |

### Lifecycle Status Colors (metadata entity states)
| Status | Hex (text/dot) | Background | Role |
|--------|----------------|------------|------|
| Draft | `#525252` | `#F5F5F5` | Editable, unvalidated metadata. |
| Validating | `#B45309` | `#FFFBEB` | Integrity engine running. |
| Valid | `#047857` | `#ECFDF5` | Passed integrity, ready to publish. |
| Published | `#4338CA` | `#EEF2FF` | Live, immutable runtime version. |
| Deprecated | `#737373` | `#FAFAFA` | Superseded, retained for audit. |
| Error | `#B91C1C` | `#FEF2F2` | Failed integrity / publication. |

### Neutral Scale
| Name | Hex | Role |
|------|-----|------|
| Background | `#F8FAFC` | App canvas / page background. |
| Surface | `#FFFFFF` | Cards, panels, tables, form containers. |
| Surface Sunken | `#F1F5F9` | Table headers, sidebars, code blocks, inset wells. |
| Border Strong | `#CBD5E1` | Input borders, table cell dividers, primary outlines. |
| Border Subtle | `#E2E8F0` | Section dividers, card borders, separator lines. |
| Text Primary | `#0F172A` | Headings, body text, table data. Near-black, cool undertone. |
| Text Secondary | `#475569` | Labels, descriptions, column headers, secondary copy. |
| Text Muted | `#94A3B8` | Placeholders, hints, disabled text, timestamps. |
| Overlay Scrim | `rgba(15,23,42,0.45)` | Modal/drawer backdrop. |

**Contrast (WCAG 2.1 AA verified)**: Text Primary on Surface ≈ 16.1:1. Text Secondary on Surface ≈ 7.6:1. Indigo 600 on white ≈ 5.6:1. All semantic text colors on their `*-light` backgrounds exceed 4.5:1. Text Muted is used only for non-essential hints, never for body content.

---

## 3. Typography Rules

### Font Stack
| Role | Font | Fallback | OpenType Features |
|------|------|----------|-------------------|
| Display / UI | Inter | `system-ui, -apple-system, sans-serif` | `"kern", "liga", "cv05", "tnum"` (tabular numerals enabled for data) |
| Body | Inter | `system-ui, -apple-system, sans-serif` | `"kern", "liga"` |
| Code / IDs / Config | JetBrains Mono | `ui-monospace, "SF Mono", monospace` | `"liga"` |

Inter is the workhorse — one family keeps an enterprise tool calm. JetBrains Mono is used for entity IDs, version tags, JSONB config keys, rule expressions, and anywhere alignment matters.

### Type Scale
| Level | Size | Weight | Line-Height | Letter-Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Display | 30px | 600 | 1.20 | -0.4px | Page-level titles (rare; mostly empty/landing states) |
| H1 | 24px | 600 | 1.25 | -0.3px | Screen titles, primary panel headers |
| H2 | 18px | 600 | 1.30 | -0.2px | Section headers, card titles |
| H3 | 15px | 600 | 1.35 | 0 | Subsection headers, group labels |
| Body | 14px | 400 | 1.55 | 0 | Default body, form values, descriptions |
| Body Strong | 14px | 500 | 1.55 | 0 | Emphasis within body, table key columns |
| Small | 13px | 400 | 1.45 | 0 | Table cell data, secondary copy, helper text |
| Label | 12px | 500 | 1.40 | +0.1px | Form labels, column headers |
| Micro | 11px | 600 | 1.30 | +0.6px | Badges, status pills, overlines — UPPERCASE |
| Code | 13px | 400 | 1.50 | 0 | IDs, versions, config keys, rule expressions |

**Rules**:
- Body default is **14px**, not 16px — this is a dense enterprise tool; 16px wastes vertical space in data views. Customer self-service channel may bump body to 15px (see §8).
- Only **3 weights**: 400 (regular), 500 (medium), 600 (semibold). Never use 700+.
- Negative tracking applies only at ≥18px. Body and below stay at 0 or slightly positive.
- Micro labels are always UPPERCASE with +0.6px tracking.
- Numeric columns and version tags use **tabular numerals** (`tnum`) so digits align in tables.

---

## 4. Component Stylings

### Buttons
| Variant | Background | Text | Border | Radius | Hover | Padding | Height |
|---------|-----------|------|--------|--------|-------|---------|--------|
| Primary | `#4F46E5` | `#FFFFFF` | none | 6px | bg `#4338CA` | px-14 py-0 | 36px |
| Secondary | `#FFFFFF` | `#0F172A` | 1px `#CBD5E1` | 6px | bg `#F1F5F9` | px-14 py-0 | 36px |
| Ghost | transparent | `#475569` | none | 6px | bg `#F1F5F9` | px-10 py-0 | 32px |
| Danger | `#B91C1C` | `#FFFFFF` | none | 6px | bg `#991B1B` | px-14 py-0 | 36px |
| Small | per variant | per variant | per variant | 6px | per variant | px-10 | 28px |

- **Focus**: `2px solid #4F46E5`, `2px` offset, on all variants (keyboard only — `:focus-visible`).
- **Active/pressed**: no scale transform (enterprise = no playful motion); background darkens one step.
- **Disabled**: bg `#F1F5F9`, text `#94A3B8`, no border, `cursor-not-allowed`.
- **Loading**: text replaced by 14px spinner in current text color; button width preserved; `aria-busy="true"`.
- Transition: `background-color 120ms ease`. No scale, no translate.

### Cards / Panels
- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border-radius: `8px`
- Shadow: none by default (flat). Interactive cards on hover: `0 1px 3px rgba(15,23,42,0.08)`.
- Padding: `16px` (compact) or `20px` (standard panel).
- Header: H2, `16px` padding, `1px solid #E2E8F0` bottom divider.

### Inputs (text, select, textarea)
- Background: `#FFFFFF` (`#F1F5F9` when disabled/readonly)
- Border: `1px solid #CBD5E1`
- Border-radius: `6px`
- Height: `36px` (single-line); textarea min `80px`
- Padding: `8px 12px`
- Font: Body 14px; mono 13px for ID/config fields
- Focus: border `#4F46E5` + ring `0 0 0 3px rgba(79,70,229,0.15)`
- Error: border `#B91C1C` + ring `0 0 0 3px rgba(185,28,28,0.12)`; helper text `#B91C1C` 12px below
- Disabled: bg `#F1F5F9`, text `#94A3B8`
- Label: Label style (12px/500), `6px` above input. Required marker: `#B91C1C` asterisk.

### Tables (core component — data density)
- Header row: bg `#F1F5F9`, text Label style (12px/500/`#475569`), sticky on scroll.
- Row height: `40px` (comfortable) / `32px` (compact toggle).
- Cell padding: `8px 12px`; cell divider: `1px solid #E2E8F0`.
- Row hover: bg `#F8FAFC`. Selected row: bg `#EEF2FF` + `2px` left border `#4F46E5`.
- Zebra striping: off by default (borders suffice); optional `#F8FAFC` on alt rows for ≥12-column tables.
- Sortable headers: caret icon `#94A3B8`, active sort `#4F46E5`.
- Row actions: Ghost icon buttons revealed on hover, always keyboard-focusable.
- Empty state: centered icon + Text Secondary message + primary action.

### Status Pills / Badges
- Micro typography (11px/600 UPPERCASE), `radius 4px`, padding `2px 8px`.
- Color = lifecycle/semantic pair from §2 (text + light background). Optional 6px leading dot.
- Never rely on color alone — always include the text label (accessibility).

### Navigation
- **Primary**: persistent left sidebar, `240px` wide (collapsible to `56px` icon rail).
  - Background `#FFFFFF`, `1px solid #E2E8F0` right border.
  - Item: 36px height, 13px text. Active: bg `#EEF2FF`, text `#4338CA`, `2px` left border `#4F46E5`. Hover: bg `#F1F5F9`.
- **Top bar**: `52px` height, `#FFFFFF`, bottom border `#E2E8F0` — holds tenant/environment switcher, global search, channel indicator, user menu.
- **Tabs** (within-panel): underline style. Active: `2px` bottom border `#4F46E5`, text `#0F172A`. Inactive: text `#475569`.
- **Breadcrumbs**: 13px, `#475569`, `/` separators `#CBD5E1`, current page `#0F172A`.

### Dependency Graph / Diagram Surface
- Canvas: `#F8FAFC` with optional `#E2E8F0` dot-grid.
- Nodes: `#FFFFFF` surface, `1px` border colored by lifecycle status, `6px` radius, 13px label.
- Edges: `1.5px` `#94A3B8`; highlighted path `#4F46E5`. Selected node: `2px` `#4F46E5` border + status-light fill.

### Modals & Drawers
- Modal: `#FFFFFF`, `12px` radius, max-width `560px`, shadow Level 3, scrim `rgba(15,23,42,0.45)`.
- Drawer (config/detail panels): right-side, `480px` wide, `#FFFFFF`, `1px` left border, shadow Level 2.
- Both trap focus, close on `Esc`, restore focus to trigger on close.

### Integrity / Validation Report Blocks
- Banner: full-width, semantic-light background, `4px` left border in semantic color, 14px text, icon leading.
- Issue list: each row = severity pill + entity ID (mono) + message + "jump to" ghost action.

---

## 5. Layout Principles

### Grid & Container
- App shell: fixed left sidebar (`240px`) + fluid main region. No global max-width on workbench screens — tables use full width.
- Reading-width content (forms, detail panels): max `760px`.
- Customer self-service channel: centered, max `560px`.
- Base spacing unit: **4px micro-grid** (IBM Carbon style — precision over breathing room).

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| 2xs | 4px | Icon-to-text gaps, pill padding |
| xs | 8px | Input padding, tight stacks |
| sm | 12px | Cell padding, label-to-input |
| md | 16px | Card padding, form field spacing |
| lg | 24px | Panel gaps, group separation |
| xl | 32px | Major region separation |
| 2xl | 48px | Page top padding, empty-state framing |

### Section Rhythm
- Page top padding: `32px`; horizontal: `24px`.
- Between stacked panels: `24px`.
- Form field vertical gap: `16px`; within a field group: `12px`.
- No cinematic spacing — this tool prioritizes information density. Max vertical gap is `48px` (empty/landing states only).

---

## 6. Depth & Elevation

Strategy: **flat-first.** Hierarchy comes from borders and background luminance (`#F8FAFC` → `#FFFFFF` → `#F1F5F9`). Shadows are reserved exclusively for elements that float above the document plane.

### Shadow System
| Level | Shadow Definition | Usage |
|-------|-------------------|-------|
| Level 0 | none | Cards, panels, tables — default flat state |
| Level 1 | `0 1px 3px rgba(15,23,42,0.08)` | Hovered interactive cards, sticky table header |
| Level 2 | `0 4px 12px rgba(15,23,42,0.10)` | Dropdowns, popovers, drawers |
| Level 3 | `0 12px 32px rgba(15,23,42,0.16)` | Modals, dialogs |

### Border Strategy
- Card / structural borders: `1px solid #E2E8F0` (Border Subtle).
- Input / table-cell / strong outlines: `1px solid #CBD5E1` (Border Strong).
- Section dividers: `1px solid #E2E8F0`.
- Focus rings: `2px solid #4F46E5` with `2px` offset (buttons/links); `3px` soft ring `rgba(79,70,229,0.15)` (inputs).
- Status emphasis: `2px` left border in lifecycle/semantic color (rows, banners).

### Layering (z-index)
| Layer | z-index |
|-------|---------|
| Background / canvas | 0 |
| Content | 10 |
| Sticky headers / sidebar | 20 |
| Dropdowns / popovers / tooltips | 30 |
| Drawers | 35 |
| Modals + scrim | 40 |
| Toasts / notifications | 50 |

---

## 7. Do's and Don'ts

### Do
- Use Indigo (`#4F46E5`) exclusively for interactive elements — CTAs, active nav, links, focus rings.
- Communicate metadata lifecycle state with the §2 status colors **plus** a text label, consistently everywhere.
- Keep body text at 14px and use the 4px micro-grid — density serves the power user.
- Use tabular numerals and JetBrains Mono for IDs, versions, and config keys so columns align.
- Express depth with borders and background luminance; reserve shadows for true overlays.
- Always design empty, loading, and error states for tables, forms, and report panels.
- Maintain WCAG 2.1 AA contrast — verify any new color pair before adopting it.
- Keep destructive actions (delete, deprecate, unpublish) behind the Danger variant + confirmation modal.

### Don't
- Never use Indigo as a decorative background fill or large color block.
- Never use pure black (`#000`) — use Text Primary `#0F172A`.
- Never rely on color alone to convey status — pair every status color with a label or icon.
- Never use more than 3 font weights (400/500/600); never use 700+.
- Never add scale/translate hover animations to buttons — enterprise UI stays still and predictable.
- Never use cinematic whitespace (80px+ section gaps) on workbench screens — it wastes the viewport.
- Never use lorem ipsum — use realistic credit-product, policy, and rule content in mockups.
- Never apply shadows to cards, tables, or panels in their resting state.

---

## 8. Responsive Behavior

The internal/branch/partner-console surfaces are desktop-first (operators on large screens). The customer self-service channel is mobile-first and must be fully responsive.

### Breakpoints
| Name | Width | Layout Changes |
|------|-------|----------------|
| Mobile | < 640px | Single column; sidebar → slide-out drawer; tables → stacked card view; forms full-width |
| Tablet | 640–1024px | Sidebar collapses to 56px icon rail; tables scroll horizontally; two-column forms allowed |
| Desktop | 1024–1440px | Full sidebar (240px); full tables; standard workbench layout |
| Wide | > 1440px | Fluid main region; reading-width content panels capped at 760px |

### Typography Scaling
| Level | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| Display | 24px | 28px | 30px |
| H1 | 20px | 22px | 24px |
| H2 | 16px | 17px | 18px |
| Body (workbench) | 14px | 14px | 14px |
| Body (self-service) | 15px | 15px | 15px |

### Component Behavior
- **Sidebar nav**: full 240px on desktop; 56px icon rail on tablet; off-canvas drawer (hamburger) on mobile.
- **Tables**: horizontal scroll with sticky first column on tablet; transform to stacked label/value cards on mobile.
- **Forms**: two-column on tablet+ where logical; single column on mobile; labels always above inputs.
- **Modals**: max 560px centered on desktop; full-screen sheet on mobile.
- **Drawers**: 480px side panel on desktop/tablet; full-screen overlay on mobile.
- **Dependency graph**: pan/zoom canvas on all sizes; on mobile defaults to fit-to-view with pinch-zoom.
- **Self-service channel**: always single-column, centered, max 560px, larger touch targets (44px min).

---

## 9. Agent Prompt Guide

### For the Frontend Engineer
1. Configure `tailwind.config.ts` with the token mapping below — exact hex values, fonts, spacing.
2. Define all color tokens as CSS variables in `globals.css` (`--color-brand`, `--color-surface`, `--status-draft`, etc.) so channel theming and a future dark mode are clean swaps.
3. Build on `@connectsw/ui` primitives; extend them — do not fork — to match this spec.
4. Create a `cn()` utility (`clsx` + `tailwind-merge`) for className composition.
5. Implement every component variant with all states: default, hover, focus-visible, active, disabled, loading, error.
6. Use `:focus-visible` for keyboard focus rings; never remove focus outlines.
7. Status colors must always render with a text label — build a single `<StatusPill>` component as the only way to display lifecycle state.
8. Enable tabular numerals on all numeric/version table columns (`font-feature-settings: "tnum"`).
9. Test every component at all four breakpoints and with keyboard-only navigation before committing.
10. The customer self-service channel uses the same tokens but with 15px body and 44px touch targets — gate via a channel/theme context, not duplicated components.

### For the UI/UX Designer
1. New components MUST follow the established radius (6/8px), flat-depth, and 4px-grid rules.
2. New colors MUST have a defined semantic role — no orphan colors. New status colors require a lifecycle rationale.
3. New typography levels MUST fit within the existing 10-level scale.
4. Propose new patterns in §7 (Do's and Don'ts) before implementing.
5. Any deviation from this system requires an ADR with rationale.

### Design Tokens (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: { DEFAULT: '#FFFFFF', sunken: '#F1F5F9' },
        border: { subtle: '#E2E8F0', strong: '#CBD5E1' },
        text: { primary: '#0F172A', secondary: '#475569', muted: '#94A3B8' },
        brand: { DEFAULT: '#4F46E5', hover: '#4338CA', light: '#EEF2FF' },
        success: { DEFAULT: '#047857', light: '#ECFDF5' },
        warning: { DEFAULT: '#B45309', light: '#FFFBEB' },
        error:   { DEFAULT: '#B91C1C', light: '#FEF2F2', hover: '#991B1B' },
        info:    { DEFAULT: '#1D4ED8', light: '#EFF6FF' },
        status: {
          draft:      { DEFAULT: '#525252', bg: '#F5F5F5' },
          validating: { DEFAULT: '#B45309', bg: '#FFFBEB' },
          valid:      { DEFAULT: '#047857', bg: '#ECFDF5' },
          published:  { DEFAULT: '#4338CA', bg: '#EEF2FF' },
          deprecated: { DEFAULT: '#737373', bg: '#FAFAFA' },
          error:      { DEFAULT: '#B91C1C', bg: '#FEF2F2' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      fontSize: {
        display:     ['30px', { lineHeight: '1.20', letterSpacing: '-0.4px', fontWeight: '600' }],
        h1:          ['24px', { lineHeight: '1.25', letterSpacing: '-0.3px', fontWeight: '600' }],
        h2:          ['18px', { lineHeight: '1.30', letterSpacing: '-0.2px', fontWeight: '600' }],
        h3:          ['15px', { lineHeight: '1.35', letterSpacing: '0',      fontWeight: '600' }],
        body:        ['14px', { lineHeight: '1.55', letterSpacing: '0' }],
        'body-lg':   ['15px', { lineHeight: '1.55', letterSpacing: '0' }],  // self-service channel
        small:       ['13px', { lineHeight: '1.45', letterSpacing: '0' }],
        label:       ['12px', { lineHeight: '1.40', letterSpacing: '0.1px', fontWeight: '500' }],
        micro:       ['11px', { lineHeight: '1.30', letterSpacing: '0.6px', fontWeight: '600' }],
        code:        ['13px', { lineHeight: '1.50', letterSpacing: '0' }],
      },
      spacing: {
        '2xs': '4px', xs: '8px', sm: '12px', md: '16px',
        lg: '24px', xl: '32px', '2xl': '48px',
        sidebar: '240px', 'sidebar-rail': '56px', drawer: '480px', topbar: '52px',
      },
      maxWidth: {
        content: '760px',
        'self-service': '560px',
        modal: '560px',
      },
      borderRadius: {
        badge: '4px',
        input: '6px',
        button: '6px',
        card: '8px',
        modal: '12px',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(15,23,42,0.08)',
        'elevation-2': '0 4px 12px rgba(15,23,42,0.10)',
        'elevation-3': '0 12px 32px rgba(15,23,42,0.16)',
        'focus-input': '0 0 0 3px rgba(79,70,229,0.15)',
        'focus-error': '0 0 0 3px rgba(185,28,28,0.12)',
      },
      zIndex: {
        sticky: '20', dropdown: '30', drawer: '35', modal: '40', toast: '50',
      },
    },
  },
  plugins: [],
};

export default config;
```

### CSS Variables (globals.css)

```css
:root {
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-sunken: #F1F5F9;
  --color-border-subtle: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  --color-brand: #4F46E5;
  --color-brand-hover: #4338CA;
  --color-brand-light: #EEF2FF;
}

/* Inter + JetBrains Mono — enable kerning, ligatures, tabular numerals */
body { font-feature-settings: "kern", "liga", "cv05"; }
.tabular { font-feature-settings: "kern", "tnum"; }
```

---

*All 9 mandatory sections present. Archetype: Clean Enterprise. Accessibility target: WCAG 2.1 AA.*
