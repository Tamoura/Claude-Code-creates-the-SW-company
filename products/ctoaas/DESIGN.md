# CTOaaS — DESIGN.md

**Product**: CTOaaS (CTO as a Service)
**Version**: 1.0
**Design Archetype**: Clean Enterprise + Dark Precision blend
**Last Updated**: 2026-04-03

---

## 1. Visual Theme & Atmosphere

**Overall Feeling**: Trusted senior advisor — authoritative, calm, data-rich. The interface should feel like walking into a well-organized executive briefing room, not a consumer app.

**Design Philosophy**: Information density with visual clarity. CTOs process large amounts of data — the UI must present complex information without overwhelming. Every pixel serves a decision. White space is strategic, not decorative.

**Signature Traits**:
- **Dual-mode interface**: Light mode for dashboards and data (trust, clarity), darker surfaces for the advisory chat (focus, immersion)
- **Deep slate palette** with indigo accents — never generic tech-blue, never playful
- **Weight restraint in typography** — authority comes from sizing and spacing, not boldness
- **Data-forward design** — charts, risk indicators, and metrics are first-class citizens, not afterthoughts
- **Ring-shadow depth** — clean, precise elevation via hairline borders and subtle shadows (Stripe/Vercel approach)
- **Professional but not corporate** — warm enough for a startup CTO, polished enough for an enterprise CIO

**Inspiration blend**:
- Stripe (precision, blue-tinted shadows, weight-300 headlines)
- Linear (data density, dark surfaces for focused work)
- Cohere (enterprise command deck, cool professionalism)
- Notion (clean white surfaces, warm near-blacks)

---

## 2. Color Palette & Roles

### Brand Colors

| Name | Hex | HSL | Role | Usage Rules |
|------|-----|-----|------|-------------|
| Indigo | `#4f46e5` | 244 76% 58% | Primary brand | CTAs, primary buttons, active states, links. Never decorative fill. |
| Indigo Hover | `#4338ca` | 244 76% 50% | Primary hover | Hover/active state for primary interactive elements |
| Indigo Light | `#eef2ff` | 226 100% 97% | Primary surface | Selected states, active tabs, subtle highlights |
| Indigo Subtle | `#c7d2fe` | 226 100% 90% | Primary border | Focus rings, selected borders |

### Semantic Colors

| Name | Hex | Role | Usage |
|------|-----|------|-------|
| Success | `#059669` | Positive actions | Low risk, passing compliance, cost savings, confirmations |
| Success Light | `#ecfdf5` | Success surface | Success alert backgrounds, positive metric cards |
| Warning | `#d97706` | Caution states | Medium risk, approaching limits, needs attention |
| Warning Light | `#fffbeb` | Warning surface | Warning alert backgrounds |
| Error | `#dc2626` | Destructive/critical | High/critical risk, validation errors, failed checks, delete actions |
| Error Light | `#fef2f2` | Error surface | Error alert backgrounds, critical risk cards |
| Info | `#2563eb` | Informational | Tooltips, informational badges, help indicators |
| Info Light | `#eff6ff` | Info surface | Info alert backgrounds |

### Risk Category Colors (Domain-Specific)

| Category | Color | Hex | Badge BG | Usage |
|----------|-------|-----|----------|-------|
| Tech Debt | Amber | `#f59e0b` | `#fffbeb` | Tech debt severity, debt tracker items |
| Vendor Risk | Violet | `#7c3aed` | `#f5f3ff` | Vendor concentration, dependency risk |
| Compliance | Blue | `#2563eb` | `#eff6ff` | Compliance gaps, regulatory items |
| Operational | Rose | `#e11d48` | `#fff1f2` | Operational risk, infrastructure issues |

### Risk Severity Scale

| Level | Color | Hex | Label |
|-------|-------|-----|-------|
| Critical (8-10) | Red | `#dc2626` | Critical |
| High (6-7) | Orange | `#ea580c` | High |
| Medium (4-5) | Amber | `#d97706` | Medium |
| Low (1-3) | Green | `#059669` | Low |

### Technology Radar Quadrant Colors

| Quadrant | Color | Hex | Usage |
|----------|-------|-----|-------|
| Languages & Frameworks | Blue | `#3b82f6` | Radar dots, legends |
| Platforms | Emerald | `#10b981` | Radar dots, legends |
| Tools | Amber | `#f59e0b` | Radar dots, legends |
| Techniques | Violet | `#8b5cf6` | Radar dots, legends |

### Neutral Scale

| Name | Hex | Role |
|------|-----|------|
| White | `#ffffff` | Page background, card backgrounds |
| Slate 50 | `#f8fafc` | Secondary backgrounds, table striping, sidebar |
| Slate 100 | `#f1f5f9` | Tertiary backgrounds, input backgrounds (disabled) |
| Slate 200 | `#e2e8f0` | Borders, dividers, input borders |
| Slate 300 | `#cbd5e1` | Stronger borders, disabled text |
| Slate 400 | `#94a3b8` | Placeholder text, muted icons |
| Slate 500 | `#64748b` | Secondary text, descriptions, labels |
| Slate 600 | `#475569` | Tertiary headings, metadata |
| Slate 700 | `#334155` | Secondary headings |
| Slate 800 | `#1e293b` | Primary headings on light backgrounds |
| Slate 900 | `#0f172a` | Primary body text, maximum contrast |
| Slate 950 | `#020617` | Display text, hero headlines |

### Chat Interface Colors (Dark Surfaces)

| Name | Hex | Role |
|------|-----|------|
| Chat BG | `#0f172a` | Chat area background (slate-900) |
| Chat Surface | `#1e293b` | Message bubbles, input area (slate-800) |
| Chat Border | `rgba(255,255,255,0.08)` | Subtle borders on dark surfaces |
| Chat Text | `rgba(255,255,255,0.92)` | Primary text on dark |
| Chat Text Muted | `rgba(255,255,255,0.55)` | Secondary text on dark (timestamps, metadata) |
| User Bubble | `#4f46e5` | User message background (brand indigo) |
| AI Bubble | `#1e293b` | AI response background (slate-800) |
| Citation | `#818cf8` | Citation links and reference numbers on dark |

---

## 3. Typography Rules

### Font Stack

| Role | Font | Fallback | OpenType Features |
|------|------|----------|-------------------|
| Display & Headings | Inter | system-ui, -apple-system, sans-serif | `"kern" 1, "liga" 1, "cv01" 1` |
| Body | Inter | system-ui, -apple-system, sans-serif | `"kern" 1, "liga" 1` |
| Code & Technical | JetBrains Mono | Menlo, Consolas, monospace | `"liga" 1` |
| Data & Numbers | Inter | system-ui, sans-serif | `"tnum" 1, "kern" 1` (tabular numbers) |

### Type Scale

| Level | Size | Weight | Line-Height | Letter-Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Display | 48px (3rem) | 300 | 1.08 | -1.5px (-0.031em) | Landing page hero, major headings |
| H1 | 36px (2.25rem) | 600 | 1.15 | -0.9px (-0.025em) | Page titles (Dashboard, Risks, Costs) |
| H2 | 24px (1.5rem) | 600 | 1.25 | -0.5px (-0.021em) | Section headers within pages |
| H3 | 20px (1.25rem) | 500 | 1.30 | -0.2px (-0.01em) | Card titles, subsection headers |
| H4 | 16px (1rem) | 600 | 1.35 | 0 | Small section headers, form labels |
| Body | 15px (0.9375rem) | 400 | 1.60 | 0 | Paragraphs, descriptions, chat messages |
| Body Small | 14px (0.875rem) | 400 | 1.50 | +0.1px (0.007em) | Secondary text, table cells, metadata |
| Caption | 13px (0.8125rem) | 500 | 1.40 | +0.2px (0.015em) | Timestamps, footnotes, helper text |
| Micro | 11px (0.6875rem) | 600 | 1.30 | +0.8px (0.073em) | Badges, status indicators, overline labels |
| Overline | 11px (0.6875rem) | 600 | 1.30 | +1.2px (0.109em) | Uppercase category labels, section overlines |

### Typography Rules

1. **Display weight is 300** (light) — this is the Stripe pattern. Authority comes from size and spacing, not weight. It signals confidence.
2. **Letter-spacing tightens with size**: -1.5px at 48px display, 0 at 15px body, +0.8px at 11px micro. This is the single most impactful rule.
3. **Line-height compresses for headings**: 1.08 for display, 1.15 for H1, expanding to 1.60 for body. Using body line-height on a heading looks amateurish.
4. **Tabular numbers for all data**: Any number that changes (metrics, costs, counts, scores) MUST use `font-variant-numeric: tabular-nums` to prevent layout shift.
5. **Code blocks and technical content** (stack names, API endpoints, config values) use JetBrains Mono at 14px, weight 400.
6. **Uppercase treatment**: ONLY for overline labels, status badges, and risk severity indicators. Never for headings, buttons, or navigation.
7. **Maximum 3 weights per view**: Typical page uses 400 (body) + 500 (emphasis) + 600 (headings). Display pages use 300 + 400 + 600.

---

## 4. Component Stylings

### Buttons

| Variant | Background | Text | Border | Radius | Hover | Padding |
|---------|-----------|------|--------|--------|-------|---------|
| Primary | `#4f46e5` (indigo) | `#ffffff` | none | 8px | `#4338ca` (darker) | py-2.5 px-4 (10px 16px) |
| Secondary | `#ffffff` | `#0f172a` | 1px `#e2e8f0` | 8px | bg-`#f8fafc`, border-`#cbd5e1` | py-2.5 px-4 |
| Ghost | transparent | `#475569` | none | 8px | bg-`#f1f5f9` | py-2.5 px-4 |
| Danger | `#dc2626` | `#ffffff` | none | 8px | `#b91c1c` | py-2.5 px-4 |
| Link | transparent | `#4f46e5` | none | 0 | underline, `#4338ca` | py-0 px-0 |

**Button rules:**
- Font: 14px, weight 500, no uppercase
- Focus: `ring-2 ring-indigo-500/40 ring-offset-2`
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: Replace label with 16px spinner, maintain button width
- Transition: `transition-colors duration-150`
- Min height: 40px (touch-friendly)
- Icon buttons: 40x40px, 20px icon

### Cards

| Variant | Background | Border | Radius | Shadow | Padding | Hover |
|---------|-----------|--------|--------|--------|---------|-------|
| Default | `#ffffff` | 1px `#e2e8f0` | 12px | `ring` (see shadows) | 24px | none |
| Interactive | `#ffffff` | 1px `#e2e8f0` | 12px | `ring` | 24px | shadow-`card-hover`, border-`#cbd5e1` |
| Stat | `#ffffff` | 1px `#e2e8f0` | 12px | `ring` | 20px | none |
| Risk | `#ffffff` | 1px `#e2e8f0` | 12px | `ring` | 24px | Left 4px border in risk category color |
| Chat Message (User) | `#4f46e5` | none | 12px 12px 4px 12px | none | 16px | none |
| Chat Message (AI) | `#1e293b` | 1px `rgba(255,255,255,0.08)` | 4px 12px 12px 12px | none | 16px | none |

### Inputs

| State | Background | Border | Ring | Text |
|-------|-----------|--------|------|------|
| Default | `#ffffff` | 1px `#e2e8f0` | none | `#0f172a` |
| Focus | `#ffffff` | 1px `#4f46e5` | 2px `#4f46e5` at 25% opacity | `#0f172a` |
| Error | `#ffffff` | 1px `#dc2626` | 2px `#dc2626` at 25% opacity | `#0f172a` |
| Disabled | `#f1f5f9` | 1px `#e2e8f0` | none | `#94a3b8` |

- Radius: 8px
- Padding: 10px 12px (py-2.5 px-3)
- Height: 40px
- Label: 14px weight 500, 4px above input
- Error text: 13px, `#dc2626`, 4px below input, prefixed with error icon
- Helper text: 13px, `#64748b`, 4px below input

### Navigation (Sidebar)

| Element | Default | Hover | Active |
|---------|---------|-------|--------|
| Nav item | `text-slate-600` | `bg-slate-100 text-slate-900` | `bg-indigo-50 text-indigo-700 font-medium` |
| Nav icon | `text-slate-400` 20px | `text-slate-600` | `text-indigo-600` |
| Section label | Overline: 11px, `text-slate-400`, uppercase, tracking +1.2px | — | — |

- Sidebar width: 256px (w-64)
- Sidebar background: `#ffffff` with right border `#e2e8f0`
- Nav item padding: py-2 px-3 (8px 12px)
- Nav item radius: 8px
- Active indicator: `aria-current="page"` + indigo background + left 3px indigo border
- Collapse on mobile: slide-out drawer with backdrop

### Badges & Status Indicators

| Variant | Background | Text | Border | Size |
|---------|-----------|------|--------|------|
| Default | `#f1f5f9` | `#475569` | none | text-micro, px-2 py-0.5 |
| Indigo | `#eef2ff` | `#4338ca` | none | same |
| Success | `#ecfdf5` | `#059669` | none | same |
| Warning | `#fffbeb` | `#d97706` | none | same |
| Danger | `#fef2f2` | `#dc2626` | none | same |
| Severity Critical | `#dc2626` | `#ffffff` | none | same, font-weight 600 |
| Severity High | `#ea580c` | `#ffffff` | none | same |
| Severity Medium | `#d97706` | `#ffffff` | none | same |
| Severity Low | `#059669` | `#ffffff` | none | same |

- Radius: 9999px (pill)
- Uppercase: YES for severity badges, NO for feature badges
- Letter-spacing: +0.8px for uppercase badges

### Data Tables

| Element | Style |
|---------|-------|
| Header row | `bg-slate-50`, text-caption weight 600, uppercase, tracking +0.8px, `text-slate-500` |
| Body row | `bg-white`, border-bottom 1px `#f1f5f9` |
| Row hover | `bg-slate-50` |
| Row selected | `bg-indigo-50` |
| Cell padding | py-3 px-4 |
| Numbers | `font-variant-numeric: tabular-nums` (MANDATORY) |

### Metric / Stat Cards

```
┌──────────────────────────────┐
│  OVERLINE LABEL (micro)       │  ← 11px, uppercase, slate-500, tracking +1.2px
│  42                           │  ← 36px, weight 600, slate-900, tabular-nums
│  ▲ 12% from last month       │  ← 13px, success/error color, with trend icon
└──────────────────────────────┘
```

- Layout: Label top, large value center, trend bottom
- Trend icons: `↑` green for positive, `↓` red for negative, `→` slate for neutral
- Card padding: 20px

### Technology Radar (Custom Visualization)

- Circular layout: 4 concentric rings (Adopt, Trial, Assess, Hold)
- Ring fill: increasing transparency from center (`#f8fafc` → transparent)
- Ring borders: 1px `#e2e8f0`
- Dot size: 8px circle, stroke 2px in quadrant color
- Selected dot: 12px, filled quadrant color, pulse animation
- Quadrant dividers: 1px dashed `#e2e8f0`
- Labels: 13px, weight 500, quadrant color
- Tooltip: Card component with tech name, ring, description

---

## 5. Layout Principles

### Grid & Container

| Property | Value | Notes |
|----------|-------|-------|
| Max width | 1280px (80rem) | Content container for dashboard pages |
| Wide max | 1440px (90rem) | Landing page, full-width layouts |
| Grid | 12 columns, 24px gap | Standard content grid |
| Base spacing unit | 8px | ALL spacing derives from this |
| Sidebar width | 256px (16rem) | Fixed sidebar, 64px collapsed on tablet |

### Spacing Scale (8px Base)

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| 0.5 | 4px | `--space-0.5` | Icon-text gap, tight inline spacing |
| 1 | 8px | `--space-1` | Input internal padding, compact gaps |
| 1.5 | 12px | `--space-1.5` | Nav item padding, small component gaps |
| 2 | 16px | `--space-2` | Standard component padding, form spacing |
| 3 | 24px | `--space-3` | Card padding, section internal spacing |
| 4 | 32px | `--space-4` | Between card groups, content sections |
| 6 | 48px | `--space-6` | Major section internal padding |
| 8 | 64px | `--space-8` | Page top padding, section dividers |
| 12 | 96px | `--space-12` | Landing page section spacing |
| 16 | 128px | `--space-16` | Hero section vertical padding |

### Page Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Topbar (h-16, border-bottom, sticky)                │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│ Sidebar│  Main Content Area                         │
│ w-64   │  max-w-[1280px] mx-auto                   │
│        │  px-6 py-8                                 │
│ Sticky │                                            │
│ h-full │  ┌────────────────────────────────────┐    │
│        │  │ Page Header (H1 + description)     │    │
│        │  ├────────────────────────────────────┤    │
│        │  │ Content (cards, tables, charts)     │    │
│        │  └────────────────────────────────────┘    │
│        │                                            │
└────────┴────────────────────────────────────────────┘
```

### Page Header Pattern

```
Page Title (H1)                              [Action Button]
Description text in slate-500                [Secondary Btn]
─────────────────────────────────────────────────────────
```
- Title: H1 (36px, weight 600)
- Description: Body Small (14px, slate-500), max 80 chars
- Action buttons: right-aligned
- Separator: 1px border `#e2e8f0`, margin-top 24px, margin-bottom 32px

### Chat Layout (Full Height)

```
┌────────┬────────────────────────────────┬──────────┐
│        │ Conversation Title             │          │
│ Conv.  │ ────────────────────────────── │ Context  │
│ List   │                                │ Panel    │
│ w-72   │ [AI message with citations]    │ w-80     │
│        │                                │          │
│        │ [User message]                 │ Citations│
│        │                                │ Sources  │
│        │ [AI typing indicator...]       │ Memory   │
│        │                                │          │
│        │ ────────────────────────────── │          │
│        │ [Input area with send button]  │          │
└────────┴────────────────────────────────┴──────────┘
```

- Chat area: Dark background (`#0f172a`)
- Conversation list: Light sidebar, same as main sidebar
- Context panel: Light sidebar, shows citations and sources
- Input area: Sticky bottom, `#1e293b` background, rounded-xl input

### Section Rhythm

| Context | Vertical Spacing | Class |
|---------|-----------------|-------|
| Between stat cards | 24px | `gap-6` |
| Between card groups | 32px | `gap-8` |
| Between page sections | 48px | `space-y-12` |
| Landing page sections | 96px | `py-24` |
| Landing hero | 128px top, 96px bottom | `pt-32 pb-24` |

---

## 6. Depth & Elevation

### Shadow System (Ring-Shadow Primary — Vercel/Stripe Approach)

| Level | Name | Shadow Definition | Usage |
|-------|------|-------------------|-------|
| 0 | `flat` | none | Flat elements, inline content |
| 1 | `ring` | `0 0 0 1px rgba(15,23,42,0.06)` | Default cards, containers (hairline border effect) |
| 2 | `card-hover` | `0 0 0 1px rgba(15,23,42,0.06), 0 4px 8px rgba(15,23,42,0.04)` | Interactive card hover |
| 3 | `dropdown` | `0 0 0 1px rgba(15,23,42,0.06), 0 8px 16px rgba(15,23,42,0.08)` | Dropdowns, popovers |
| 4 | `modal` | `0 0 0 1px rgba(15,23,42,0.06), 0 16px 32px rgba(15,23,42,0.12)` | Modals, dialogs |
| 5 | `toast` | `0 0 0 1px rgba(15,23,42,0.06), 0 12px 24px rgba(15,23,42,0.10)` | Toast notifications |

**Shadow color note**: All shadows use `rgba(15,23,42,...)` (slate-900) — NOT pure black. This creates softer, more refined depth that matches the slate palette.

### Border Strategy

| Context | Border | Notes |
|---------|--------|-------|
| Card borders | 1px `#e2e8f0` (slate-200) | Primary structural borders |
| Dividers | 1px `#f1f5f9` (slate-100) | Subtle separators within cards |
| Input borders | 1px `#e2e8f0` (slate-200) | Standard form inputs |
| Focus borders | 1px `#4f46e5` + 2px ring `rgba(79,70,229,0.25)` | Indigo focus ring |
| Dark surface borders | 1px `rgba(255,255,255,0.08)` | Chat interface borders |
| Active sidebar item | Left 3px `#4f46e5` | Navigation active indicator |
| Risk card accent | Left 4px in category color | Visual category coding |

### Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Background | 0 | Page content, cards |
| Sticky sidebar | 10 | Left sidebar navigation |
| Sticky topbar | 20 | Top navigation bar |
| Dropdown/Popover | 30 | Menus, tooltips, popovers |
| Drawer overlay | 35 | Mobile navigation backdrop |
| Drawer | 40 | Mobile navigation panel |
| Modal backdrop | 45 | Modal overlay |
| Modal | 50 | Modal dialog |
| Toast | 60 | Toast notifications (always on top) |

---

## 7. Do's and Don'ts

### Do

- **Do** use indigo (`#4f46e5`) exclusively for interactive CTAs, active states, and links — it is a signal, not a surface
- **Do** use tabular numbers (`font-variant-numeric: tabular-nums`) on ALL numerical data — costs, scores, counts, percentages
- **Do** use the 8px grid for all spacing — no arbitrary pixel values
- **Do** use ring-shadows (Level 1) as the default card treatment — not drop shadows
- **Do** tighten letter-spacing as font size increases: -1.5px at 48px, -0.9px at 36px, 0 at 15px body
- **Do** use the dark chat surface (`#0f172a`) only for the advisory chat interface — all other pages are light
- **Do** use left-border color coding on risk cards (4px in category color) for instant visual scanning
- **Do** use uppercase overline labels (11px, tracking +1.2px) for section categorization
- **Do** show risk severity with filled pill badges (red/orange/amber/green with white text)
- **Do** display an AI disclaimer on every advisory response: "AI-generated advisory — not professional advice"
- **Do** use the `cv01` OpenType feature for Inter to get the alternative "a" glyph (more distinctive)

### Don't

- **Don't** use indigo as a background fill — it's for interactive elements only
- **Don't** use pure black (`#000000`) anywhere — use slate-950 (`#020617`) or slate-900 (`#0f172a`)
- **Don't** use more than 3 font weights on a single page (300/400/600 or 400/500/600)
- **Don't** use drop shadows heavier than Level 2 on cards — this is a professional tool, not a consumer app
- **Don't** use rounded-full (pill) on cards or containers — only on badges and avatar indicators
- **Don't** use gradients on backgrounds or surfaces — flat colors only, depth via borders and shadows
- **Don't** mix the dark chat palette into dashboard pages — the dual-mode is intentional and separate
- **Don't** use body line-height (1.60) on headings — headings compress to 1.08-1.30
- **Don't** hardcode risk category colors — use the semantic tokens so categories can be recolored
- **Don't** use lorem ipsum or placeholder data — always use realistic CTO scenarios (e.g., "Should we migrate from AWS to GCP?")
- **Don't** animate beyond `transition-colors` and `transition-shadow` — this is a productivity tool, not a showcase

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Layout Changes |
|------|-------|--------------------|
| Mobile | < 640px | Single column, hamburger nav, stacked stat cards, chat full-width, no context panel |
| Tablet | 640px–1024px | Sidebar collapses to 64px (icons only), 2-column stat grid, chat hides context panel |
| Desktop | 1024px–1440px | Full sidebar (256px), 3-4 column stat grid, chat with context panel, full tables |
| Wide | > 1440px | Content centered at max-width 1280px, comfortable margins |

### Typography Scaling

| Level | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| Display | 32px (-0.8px) | 40px (-1.2px) | 48px (-1.5px) |
| H1 | 28px (-0.5px) | 32px (-0.7px) | 36px (-0.9px) |
| H2 | 20px (-0.3px) | 22px (-0.4px) | 24px (-0.5px) |
| H3 | 18px (-0.1px) | 18px (-0.1px) | 20px (-0.2px) |
| Body | 15px | 15px | 15px |
| Body Small | 14px | 14px | 14px |

### Component Responsive Behavior

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Hidden, slide-out drawer with backdrop | Collapsed 64px (icons + tooltips) | Full 256px with labels |
| Topbar | Logo + hamburger + avatar | Logo + hamburger + search + avatar | Logo + breadcrumbs + search + notifications + avatar |
| Stat cards | 1 column, full width | 2 columns | 3-4 columns |
| Risk dashboard | Stacked category cards | 2x2 grid | 4-column row |
| Data tables | Card view (each row = card) | Horizontal scroll with frozen first column | Full table |
| Chat layout | Full-width chat, no sidebar panels | Chat + conversation list (no context) | Chat + conversation list + context panel |
| Radar | Simplified list view | Small radar (400px) | Full radar (600px) + detail panel |
| Onboarding | Full-width steps, bottom nav | Centered 540px card | Centered 640px card |

### Mobile-Specific Rules

- Bottom navigation bar on mobile (visible below lg breakpoint): Dashboard, Chat, Risks, Costs, More
- Touch targets minimum 48x48px
- Chat input sticks to bottom with safe-area padding
- Swipe to dismiss conversation list on mobile
- Stat cards: full width with horizontal scroll if > 4

---

## 9. Agent Prompt Guide

### For the Frontend Engineer

When implementing this design system:

1. **Configure `tailwind.config.ts`** with the exact tokens from Sections 2-6 (see config below)
2. **Set up CSS variables** in `globals.css` for all color, font, and radius tokens
3. **Enable OpenType features** globally: `font-feature-settings: "kern" 1, "liga" 1, "cv01" 1`
4. **Apply `tabular-nums`** via utility class on ALL numerical displays
5. **Implement the dual-mode**: Light pages (dashboard, settings) vs dark chat interface — they share the same sidebar/topbar
6. **Use `cn()` utility** (clsx + tailwind-merge) for all className composition
7. **Use `cva`** (class-variance-authority) for button, badge, card, and input variants
8. **Build the sidebar** with `aria-current="page"` on active items and the 3px left indigo border
9. **Ring-shadow is the default** card treatment — use `shadow-ring` custom utility
10. **Test at all 4 breakpoints**: 375px (mobile), 768px (tablet), 1280px (desktop), 1440px (wide)

### For the UI/UX Designer

When extending this design system:

1. New components MUST follow the established radius (8px components, 12px cards, 9999px badges)
2. New colors MUST have a semantic role defined in Section 2 — no orphan hex values
3. New data visualizations use the radar quadrant color palette (blue, emerald, amber, violet)
4. Risk-related elements MUST use the severity scale (critical/high/medium/low) with the defined colors
5. The chat interface is the ONE dark surface — do not introduce dark surfaces elsewhere
6. Propose new patterns via ADR before implementing

### Design Tokens (Tailwind Config)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          light: '#eef2ff',
          subtle: '#c7d2fe',
          ring: 'rgba(79,70,229,0.25)',
        },
        // Semantic
        success: { DEFAULT: '#059669', light: '#ecfdf5' },
        warning: { DEFAULT: '#d97706', light: '#fffbeb' },
        error: { DEFAULT: '#dc2626', light: '#fef2f2' },
        info: { DEFAULT: '#2563eb', light: '#eff6ff' },
        // Risk categories
        risk: {
          'tech-debt': '#f59e0b',
          vendor: '#7c3aed',
          compliance: '#2563eb',
          operational: '#e11d48',
        },
        // Radar quadrants
        radar: {
          languages: '#3b82f6',
          platforms: '#10b981',
          tools: '#f59e0b',
          techniques: '#8b5cf6',
        },
        // Chat (dark surfaces)
        chat: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: 'rgba(255,255,255,0.08)',
          text: 'rgba(255,255,255,0.92)',
          muted: 'rgba(255,255,255,0.55)',
          citation: '#818cf8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display': ['3rem', { lineHeight: '1.08', letterSpacing: '-0.031em' }],
        'h1': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
        'h2': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.021em' }],
        'h3': ['1.25rem', { lineHeight: '1.30', letterSpacing: '-0.01em' }],
        'h4': ['1rem', { lineHeight: '1.35', letterSpacing: '0' }],
        'body': ['0.9375rem', { lineHeight: '1.60', letterSpacing: '0' }],
        'body-sm': ['0.875rem', { lineHeight: '1.50', letterSpacing: '0.007em' }],
        'caption': ['0.8125rem', { lineHeight: '1.40', letterSpacing: '0.015em' }],
        'micro': ['0.6875rem', { lineHeight: '1.30', letterSpacing: '0.073em' }],
        'overline': ['0.6875rem', { lineHeight: '1.30', letterSpacing: '0.109em' }],
      },
      spacing: {
        'section-sm': '3rem',    // 48px
        'section-md': '4rem',    // 64px
        'section-lg': '6rem',    // 96px
        'section-xl': '8rem',    // 128px
      },
      maxWidth: {
        'content': '80rem',   // 1280px
        'wide': '90rem',      // 1440px
        'onboarding': '40rem', // 640px
      },
      boxShadow: {
        'ring': '0 0 0 1px rgba(15,23,42,0.06)',
        'card-hover': '0 0 0 1px rgba(15,23,42,0.06), 0 4px 8px rgba(15,23,42,0.04)',
        'dropdown': '0 0 0 1px rgba(15,23,42,0.06), 0 8px 16px rgba(15,23,42,0.08)',
        'modal': '0 0 0 1px rgba(15,23,42,0.06), 0 16px 32px rgba(15,23,42,0.12)',
        'toast': '0 0 0 1px rgba(15,23,42,0.06), 0 12px 24px rgba(15,23,42,0.10)',
      },
      borderRadius: {
        'component': '8px',
        'card': '12px',
        'badge': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.3)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### CSS Variables (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* OpenType features */
    font-feature-settings: "kern" 1, "liga" 1, "cv01" 1;

    /* Tabular numbers utility */
    --font-tabular: "tnum" 1;
  }

  /* Tabular numbers on data elements */
  [data-numeric] {
    font-variant-numeric: tabular-nums;
  }

  /* Smooth transitions for interactive elements */
  button, a, input, select, textarea {
    transition-property: color, background-color, border-color, box-shadow;
    transition-duration: 150ms;
    transition-timing-function: ease;
  }
}

@layer utilities {
  .font-tabular {
    font-variant-numeric: tabular-nums;
  }
}
```
