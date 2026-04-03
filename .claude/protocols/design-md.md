# DESIGN.md Protocol

## What is DESIGN.md?

DESIGN.md is a structured design system specification that complements AGENTS.md. Where AGENTS.md instructs coding agents on project construction, DESIGN.md guides design and frontend agents on visual presentation. Every ConnectSW product MUST have a DESIGN.md file at `$PRODUCT_DIR/DESIGN.md`.

Inspired by [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — 60+ real-world design system extractions from companies like Stripe, Linear, Vercel, Notion, and Apple.

## Why DESIGN.md Matters

Without a DESIGN.md, agents produce generic UI. With one, they produce pixel-consistent, brand-coherent interfaces. DESIGN.md serves as the single source of truth for all visual decisions across a product.

## Mandatory Sections (9 Required)

Every DESIGN.md MUST contain these 9 sections. This is non-negotiable.

### 1. Visual Theme & Atmosphere

Define the emotional tone and visual personality of the product.

```markdown
## Visual Theme & Atmosphere

**Overall Feeling**: [e.g., "Warm, unhurried literary sophistication" or "Dark-mode-first precision engineering"]
**Design Philosophy**: [e.g., "Content-first — interface disappears, content speaks" or "Terminal-native command center aesthetic"]
**Signature Traits**:
- [e.g., "Warm tones throughout — no cool blues except for accessibility focus rings"]
- [e.g., "Editorial serif/sans hierarchy — serif for headlines, sans for UI"]
- [e.g., "Cinematic spacing — 80-120px between sections creates breathing room"]
```

**Reference patterns from real products:**

| Pattern | Examples |
|---------|----------|
| Warm minimalism | Claude (parchment tones), Cursor (warm off-white), PostHog (sage/olive) |
| Dark precision | Linear (near-black canvas), Raycast (blue-tinted dark), Framer (pure black) |
| Clean enterprise | Stripe (white + deep navy), IBM (stark minimalism), HashiCorp (dual-mode) |
| Playful craft | Clay (cream + playful colors), Zapier (warm cream), Miro (collaborative pastels) |
| Cinematic | SpaceX (full-viewport photography), Runway (video-first), Apple (product-focused) |

### 2. Color Palette & Roles

Define every color with its hex value AND its semantic role. Never use colors without roles.

```markdown
## Color Palette & Roles

### Brand Colors
| Name | Hex | Role | Usage Rules |
|------|-----|------|-------------|
| [Name] | #XXXXXX | Primary brand | CTAs only, never decorative |
| [Name] | #XXXXXX | Accent | Hover states, highlights |

### Semantic Colors
| Name | Hex | Role |
|------|-----|------|
| Success | #XXXXXX | Positive actions, confirmations |
| Warning | #XXXXXX | Caution states |
| Error | #XXXXXX | Destructive actions, validation errors |
| Info | #XXXXXX | Informational elements |

### Neutral Scale
| Name | Hex | Role |
|------|-----|------|
| Background | #XXXXXX | Page background |
| Surface | #XXXXXX | Card/panel backgrounds |
| Border | #XXXXXX | Dividers, outlines |
| Text Primary | #XXXXXX | Headings, body text |
| Text Secondary | #XXXXXX | Descriptions, labels |
| Text Muted | #XXXXXX | Placeholders, hints |
```

**Key principles from industry leaders:**
- **Stripe**: Blue-tinted shadow colors `rgba(50,50,93,0.25)` — shadows carry brand
- **Linear**: White at varying opacity for hierarchy on dark backgrounds
- **Claude**: Warm-toned everything — even shadows have warmth
- **Coinbase**: Brand blue ONLY for functional interactive elements, never decorative
- **IBM**: Single accent color (IBM Blue 60) — maximum discipline
- **Notion**: Near-black with warm undertones `rgba(0,0,0,0.95)` instead of pure black

### 3. Typography Rules

Define font families, sizes, weights, line-heights, and letter-spacing with precision.

```markdown
## Typography Rules

### Font Stack
| Role | Font | Fallback | OpenType Features |
|------|------|----------|-------------------|
| Display | [Font] | system-ui, sans-serif | `"kern"`, `"liga"` |
| Body | [Font] | system-ui, sans-serif | `"kern"` |
| Code | [Font] | monospace | `"liga"` (if supported) |

### Type Scale
| Level | Size | Weight | Line-Height | Letter-Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Display | 64-96px | 300-700 | 1.00-1.10 | -1.5px to -3px | Hero headlines |
| H1 | 36-48px | 600-700 | 1.10-1.20 | -0.5px to -1.5px | Page titles |
| H2 | 24-30px | 600 | 1.20-1.30 | -0.3px to -0.5px | Section headers |
| H3 | 20-24px | 500-600 | 1.25-1.35 | 0 | Subsections |
| Body | 16px | 400 | 1.50-1.65 | 0 to +0.2px | Paragraphs |
| Small | 14px | 400-500 | 1.40-1.50 | 0 to +0.2px | Labels, captions |
| Micro | 11-12px | 500-600 | 1.30 | +0.5px to +1.3px | Badges, overlines |
```

**Critical typography patterns from real products:**
- **Negative letter-spacing scales with size**: The larger the text, the tighter the tracking. At 64px+, use -1.5px to -3px. At 16px body, use 0 or slightly positive.
- **Line-height compresses for headlines**: Display text uses 1.00-1.10, body uses 1.50-1.65. Never use body line-height on headlines.
- **Weight restraint**: Many premium brands use fewer weights (Vercel: 400/500/600 only; Supabase: 400/500 only; Revolut: 500 only).
- **OpenType features matter**: Linear requires `cv01` and `ss03` for Inter. Stripe uses `ss01` for Sohne. Notion uses `lnum` and `locl`.
- **Uppercase micro-labels**: Small, uppercase text with wide letter-spacing (1-2px) for category labels, overlines, and status badges.

### 4. Component Stylings

Define the visual treatment for all core components.

```markdown
## Component Stylings

### Buttons
| Variant | Background | Text | Border | Radius | Hover | Padding |
|---------|-----------|------|--------|--------|-------|---------|
| Primary | [color] | [color] | none | [value] | [behavior] | py-X px-Y |
| Secondary | transparent | [color] | 1px [color] | [value] | [behavior] | py-X px-Y |
| Ghost | transparent | [color] | none | [value] | bg-[subtle] | py-X px-Y |

### Cards
- Background: [value]
- Border: [value]
- Border-radius: [value]
- Shadow: [definition]
- Padding: [value]
- Hover: [behavior]

### Inputs
- Border: [value]
- Border-radius: [value]
- Focus ring: [value]
- Error state: [value]
- Padding: [value]
- Height: [value]

### Navigation
- Style: [top bar / sidebar / etc.]
- Active indicator: [underline / background / border]
- Hover behavior: [value]
```

**Industry-proven component patterns:**

| Pattern | Who Uses It | Tailwind Approximation |
|---------|-------------|----------------------|
| Pill buttons (9999px radius) | Stripe, Vercel, Framer, Supabase, Expo | `rounded-full` |
| Sharp rectangles (0px radius) | IBM, BMW, SpaceX | `rounded-none` |
| Conservative radius (4-8px) | Webflow, Intercom, OpenCode | `rounded` / `rounded-md` |
| Generous radius (12-24px) | Airtable, Cohere, Pinterest | `rounded-xl` / `rounded-2xl` |
| Frosted glass cards | Resend, Together.AI | `bg-white/10 backdrop-blur-md border border-white/20` |
| Ring shadow borders | Vercel, Linear | `shadow-[0_0_0_1px_rgba(0,0,0,0.08)]` |
| Inset shadow buttons | Lovable, Sentry | `shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]` |
| Scale hover (1.02-1.05) | Wise, Warp, Framer | `hover:scale-[1.02] transition-transform` |
| Translate hover | Webflow, Clay | `hover:-translate-y-1 transition-transform` |

### 5. Layout Principles

Define the grid, spacing system, and structural rules.

```markdown
## Layout Principles

### Grid & Container
- Max width: [e.g., 1200px, 1440px, 1600px]
- Grid: [e.g., 12-column with 24px gap]
- Base spacing unit: [e.g., 8px]

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline spacing, icon gaps |
| sm | 8px | Component internal padding |
| md | 16px | Card padding, form spacing |
| lg | 24px | Section internal spacing |
| xl | 48px | Section gaps |
| 2xl | 64px | Major section dividers |
| 3xl | 80-120px | Hero/section vertical spacing |

### Section Rhythm
- Hero sections: [e.g., 100vh or min-h-[600px]]
- Content sections: [e.g., py-20 to py-32]
- Between sections: [e.g., 80-120px gap]
```

**Spacing philosophies from industry leaders:**
- **Cinematic spacing** (80-120px sections): Vercel, Expo, Supabase, Composio — creates premium breathing room
- **Compact density**: Spotify, Linear — content density over whitespace
- **8px grid**: Used by virtually all modern design systems (Uber, Revolut, Intercom, Miro)
- **4px micro-grid**: IBM, OpenCode — for tighter precision
- **Full-viewport heroes**: Apple, SpaceX, MongoDB — 100vh sections for impact

### 6. Depth & Elevation

Define how depth and layering are communicated.

```markdown
## Depth & Elevation

### Shadow System
| Level | Shadow Definition | Usage |
|-------|-------------------|-------|
| Level 0 | none | Flat elements |
| Level 1 | 0 1px 2px rgba(0,0,0,0.05) | Subtle lift (cards) |
| Level 2 | 0 4px 6px rgba(0,0,0,0.07) | Moderate lift (dropdowns) |
| Level 3 | 0 10px 15px rgba(0,0,0,0.10) | High lift (modals) |
| Level 4 | 0 20px 25px rgba(0,0,0,0.15) | Maximum lift (popovers) |

### Border Strategy
- Primary borders: [e.g., 1px solid rgba(0,0,0,0.08)]
- Separator lines: [e.g., 1px solid rgba(0,0,0,0.05)]
- Focus rings: [e.g., 2px solid #3898ec, 2px offset]

### Layering
- Background: z-0
- Content: z-10
- Sticky elements: z-20
- Dropdowns: z-30
- Modals: z-40
- Toasts: z-50
```

**Depth trends from real products:**
- **Shadow-averse** (borders instead): Supabase, Linear, ClickHouse, Replicate — `border` over `box-shadow`
- **Ring shadows** (simulated borders): Vercel `shadow-[0_0_0_1px]`, Notion multi-layer stacks
- **Warm-tinted shadows**: Stripe `rgba(50,50,93,0.25)`, Claude warm shadows, Mistral amber-tinted
- **Multi-layer shadow stacks**: ElevenLabs (sub-0.1 opacity), Raycast (five-layer key caps)
- **Flat/zero shadows**: IBM, Ollama, Revolut, X.AI — depth through background luminance only

### 7. Do's and Don'ts

Explicit rules for maintaining brand consistency.

```markdown
## Do's and Don'ts

### Do
- [e.g., "Use brand color exclusively for interactive CTAs"]
- [e.g., "Maintain 80-120px vertical spacing between sections"]
- [e.g., "Use negative letter-spacing on all text above 24px"]
- [e.g., "Always use 8px grid for spacing"]

### Don't
- [e.g., "Never use brand color as a background fill"]
- [e.g., "Never use pure black (#000) — use near-black with warm undertone"]
- [e.g., "Never use more than 3 font weights on a single page"]
- [e.g., "Never use drop shadows — use borders for depth"]
- [e.g., "Never use lorem ipsum — always use real or realistic content"]
```

### 8. Responsive Behavior

Define how the design adapts across viewport sizes.

```markdown
## Responsive Behavior

### Breakpoints
| Name | Width | Layout Changes |
|------|-------|----------------|
| Mobile | < 640px | Single column, hamburger nav, stacked cards |
| Tablet | 640-1024px | Two columns, condensed nav |
| Desktop | 1024-1440px | Full layout, sidebar nav |
| Wide | > 1440px | Centered content with max-width |

### Typography Scaling
| Level | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| Display | 36px | 48px | 64-96px |
| H1 | 28px | 32px | 36-48px |
| H2 | 22px | 24px | 24-30px |
| Body | 16px | 16px | 16px |

### Component Behavior
- Navigation: [e.g., "Hamburger on mobile, horizontal tabs on desktop"]
- Cards: [e.g., "Stack vertically on mobile, 2-col on tablet, 3-col on desktop"]
- Sidebar: [e.g., "Hidden on mobile with slide-out drawer"]
- Tables: [e.g., "Horizontal scroll or card view on mobile"]
- Hero: [e.g., "Full-viewport on all sizes, text scales down"]
```

### 9. Agent Prompt Guide

Instructions for AI agents consuming this DESIGN.md.

```markdown
## Agent Prompt Guide

### For the Frontend Engineer
When implementing this design system:
1. Configure `tailwind.config.ts` with the exact color palette, font families, and spacing scale
2. Set up CSS variables for all color tokens: `--color-primary`, `--color-surface`, etc.
3. Create a `cn()` utility (clsx + tailwind-merge) for className composition
4. Implement all component variants as described — do not deviate from the spec
5. Apply letter-spacing rules precisely — use custom Tailwind utilities if needed
6. Test every component at all breakpoints before committing

### For the UI/UX Designer
When extending this design system:
1. New components MUST follow the established visual language (radius, shadows, spacing)
2. New colors MUST have a defined role — no orphan colors
3. New typography levels MUST fit within the existing scale
4. Propose new patterns in the Do's and Don'ts section before implementing
5. Any deviation from the system requires an ADR with rationale

### Design Tokens (Tailwind Config)
[Include a partial tailwind.config.ts showing how to implement the design system]
```

## Creating a DESIGN.md for a New Product

### Step 1: Define the Brand Personality

Choose one of these archetypes (or blend):

| Archetype | Characteristics | Inspiration |
|-----------|----------------|-------------|
| **Warm Minimalist** | Cream/parchment backgrounds, warm neutrals, serif accents, generous whitespace | Claude, Cursor, Lovable, Zapier |
| **Dark Precision** | Near-black canvas, monospace accents, tight spacing, border-driven depth | Linear, Raycast, Sentry, ClickHouse |
| **Clean Enterprise** | White backgrounds, single accent color, conservative radius, professional typography | Stripe, IBM, HashiCorp, Cohere |
| **Developer Playful** | Bold gradients, code-native typography, energetic accents, pill shapes | Replicate, Mintlify, Expo, MongoDB |
| **Luxury Product** | Full-viewport imagery, extreme typography, minimal UI, cinematic spacing | Apple, SpaceX, Runway, Superhuman |

### Step 2: Extract Design Tokens

For each archetype, derive concrete values:

| Token | Warm Minimalist | Dark Precision | Clean Enterprise |
|-------|----------------|----------------|------------------|
| Background | `#faf9f7` (warm cream) | `#08090a` (near-black) | `#ffffff` (pure white) |
| Surface | `#ffffff` | `#111213` | `#f9fafb` |
| Border | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | `#e5e7eb` |
| Text Primary | `#1c1c1e` | `rgba(255,255,255,0.95)` | `#111827` |
| Brand Accent | Warm (terracotta, amber) | Cool (cyan, emerald, blue) | Single (blue, purple) |
| Radius | 8-12px | 4-8px | 4-8px |
| Shadow Strategy | Subtle warm shadows | Borders, no shadows | Blue-tinted shadows |
| Section Spacing | 80-120px | 64-96px | 48-80px |
| Font Personality | Serif display + sans body | Mono display + sans body | Sans throughout |

### Step 3: Write the DESIGN.md

Use the 9-section template above. Be specific — hex values, not "blue". Pixel values, not "large".

### Step 4: Implement in Tailwind

Create a `tailwind.config.ts` that encodes the design tokens:

```typescript
// Example: Warm Minimalist configuration
const config = {
  theme: {
    extend: {
      colors: {
        background: '#faf9f7',
        surface: '#ffffff',
        border: 'rgba(0,0,0,0.08)',
        'text-primary': '#1c1c1e',
        'text-secondary': '#6b6b6b',
        brand: {
          DEFAULT: '#c96442',
          hover: '#b55a3a',
          light: '#f5e6df',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        'display-tight': '-0.03em',
        'heading-tight': '-0.02em',
        'body-normal': '0',
        'micro-wide': '0.05em',
      },
      lineHeight: {
        'display': '1.05',
        'heading': '1.20',
        'body': '1.60',
      },
      spacing: {
        'section-sm': '48px',
        'section-md': '80px',
        'section-lg': '120px',
      },
      maxWidth: {
        'content': '1200px',
      },
    },
  },
};
```

## DESIGN.md Quality Checklist

Before approving any DESIGN.md:

- [ ] All 9 sections present and complete
- [ ] Every color has a hex value AND a semantic role
- [ ] Typography scale includes size, weight, line-height, AND letter-spacing
- [ ] Component styles include ALL states (default, hover, focus, active, disabled)
- [ ] Layout spacing uses consistent base unit (4px or 8px)
- [ ] Responsive behavior defined for at least 3 breakpoints
- [ ] Do's and Don'ts include at least 5 entries each
- [ ] Agent Prompt Guide includes Tailwind config snippet
- [ ] No generic values ("blue", "large") — only specific values (#3B82F6, 48px)
- [ ] Accessibility considerations addressed (contrast ratios, focus indicators)
