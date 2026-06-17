# StudyFlow — Design System

> **Archetype:** Sage Enterprise — calm, professional, trustworthy. A
> sage/forest-green palette on generous whitespace, with bold geometric display
> headlines and soft, low-contrast surfaces. Re-skinned to match the ConnectGRC
> product family.

This document is the single source of truth for StudyFlow's visual language.
It maps directly to the Tailwind tokens in
`apps/web/tailwind.config.ts` and the utility classes in
`apps/web/src/app/globals.css`.

---

## 1. Design Principles

1. **Calm over loud.** Lots of whitespace, soft shadows, muted greens. Nothing
   competes for attention except the one primary action on a screen.
2. **One accent, used sparingly.** Sage-green signals "primary / progress /
   active". Everything else is near-black text on near-white surfaces.
3. **Bold, confident headlines.** Display type is heavy and tight-tracked, with a
   single phrase picked out in sage-green.
4. **Soft enterprise surfaces.** Large-radius cards, 1px hairline borders, and
   barely-there shadows — never harsh lines or heavy drop shadows.
5. **Accessible by default.** Text greens are dark (sage-700/800) to clear WCAG
   AA; fills use sage-600. Every interactive element has a visible focus ring.

---

## 2. Color Tokens

The palette was sampled directly from the ConnectGRC live site (the rendered
"Sign up" button = `#00786f`, accents = `#009689`, dark heading-accent =
`#005f5a`). The `sage` scale is the primary brand scale; `brand` is **aliased**
to `sage` so all legacy `brand-*` utilities inherit the new palette.

### Sage (primary)

| Token | Hex | Usage |
|-------|-----|-------|
| `sage-50`  | `#f1f9f7` | Tinted backgrounds, badge/pill fills, progress track |
| `sage-100` | `#d9efe9` | Pill/badge rings, soft dividers |
| `sage-200` | `#b3ddd2` | Hover tints, subtle accents |
| `sage-300` | `#84c4b5` | Decorative, disabled-on-sage |
| `sage-400` | `#52a394` | Secondary progress, muted accents |
| `sage-500` | `#2d8576` | Mid-progress fill, accent text on dark |
| **`sage-600`** | **`#00786f`** | **DEFAULT — primary buttons, logo, headline accent, links-on-light** |
| `sage-700` | `#005f5a` | Hover-darken, body link text, secondary-button text |
| `sage-800` | `#0b4f4a` | Deep accents, success-badge text |
| `sage-900` | `#0c3e3a` | Darkest accent |

### Neutrals & surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| Page background | `#fafbfb` | App + page canvas |
| Card background | `#ffffff` | Cards, sidebar, nav |
| Card border | `#eceeed` | 1px hairline card/section borders |
| Heading text | `slate-900` `#0f172a` | Display headlines, primary text |
| Body text | `slate-600` `#475569` | Paragraphs, descriptions |
| Muted text | `slate-500 / 400` | Captions, metadata |

### Semantic tones (badges / status)

| Tone | Fill / Text | Usage |
|------|-------------|-------|
| `brand` (sage) | `sage-50` / `sage-700` | Active goals, default brand badges |
| `success` | `sage-100` / `sage-800` | Completed goals |
| `warning` | `amber-100` / `amber-800` | At-risk goals, mid/low progress |
| `danger` | `red-100` / `red-700` | Errors, abandoned |
| `neutral` | `slate-100` / `slate-700` | Draft, generic |

> **Contrast:** sage-600 on white ≈ 4.9:1, sage-700 on white ≈ 7:1 — both pass
> WCAG AA for normal text. White on sage-600 ≈ 4.9:1 — passes AA for the button
> label.

---

## 3. Typography

| Role | Font | Weight | Tracking | Notes |
|------|------|--------|----------|-------|
| Display headlines (`h1–h3`) | **Poppins** (`--font-poppins`, `font-display`) | 600–800 | tight (`tracking-tight`) | Bold geometric sans; near-black with one sage phrase |
| Body / UI | **Inter** (`--font-inter`, `font-sans`) | 400–600 | normal | All paragraphs, labels, controls |

Both are wired via `next/font/google` in `apps/web/src/app/layout.tsx` (no
manual `<link>` tags, no lockfile dependency). The `h1, h2, h3` base rule in
`globals.css` applies `font-display tracking-tight` automatically.

**Display scale (hero → section):** `text-6xl` (hero h1) · `text-2xl` (auth
card title) · `text-lg` (card/section headings) · `text-sm` (body) ·
`text-xs` (pills, metadata).

**Headline pattern:** two-line near-black headline with ONE phrase in sage:

```
Choose your subjects. <span class="text-sage-600">Track every step.</span>
```

---

## 4. Spacing & Layout

- **Container:** `max-w-6xl` centered, `px-6` gutters.
- **Rhythm:** vertical stacks use `space-y-6` (sections) / `space-y-3` (lists).
- **Card padding:** `p-6` generous interior.
- **Whitespace first:** hero uses `pt-16 → pt-24`, sections `pb-24`.
- **Grid:** dashboard stats `sm:grid-cols-3`; main content `lg:grid-cols-3`
  (goals span 2, sidebar 1).

---

## 5. Components

### Cards (`.card`)
`rounded-2xl border border-[#eceeed] bg-white p-6 shadow-card`. Hover-elevate
marketing cards with `hover:shadow-card-hover`. Large radius, hairline border,
soft shadow, white surface.

### Buttons
- **Primary** (`.btn-primary` / `<Button>`): solid `sage-600`, white text,
  `rounded-lg`, `font-medium`, `hover:sage-700`. The canonical "Start for free"
  / "Sign up" button.
- **Secondary** (`.btn-secondary`): light `sage-50` pill, `sage-700` text,
  `ring-sage-100` — the "I already have an account / Learn more →" style.
- **Ghost**: transparent → `sage-50` tint on hover (used for "Sign out").
- **Circular icon button** (`.btn-icon-circle`): `h-9 w-9 rounded-full
  bg-sage-600` with a chevron — sits top-right of feature cards as the primary
  action affordance.

### Badges & Pills
- **Pill** (`.pill`): `rounded-full bg-sage-50 text-sage-700 ring-sage-100` —
  category labels ("For university students", subject codes).
- **Badge / StatusBadge** (`feedback.tsx`): `rounded-full` with semantic tones
  above. Active = sage, Completed = sage (success), At risk = amber.

### Progress bars (`ProgressBar`)
Track = `bg-sage-50`, fill tone by value: `sage-600` (complete), `sage-500`
(≥50%), `amber-500` (<50%). Rounded-full, animated width. Used for goal
completion, subject averages, and streak context on the dashboard.

### Form fields (`Input` / `Textarea` / `Select`)
White `rounded-lg` field, `border-slate-300`, focus → `border-sage-500` +
`ring-sage-200`. Labels always present (`htmlFor`), errors via
`aria-invalid` + `aria-describedby` + `role="alert"`.

### Navigation
- **Public nav:** logo left, "Log in" text link + solid sage "Sign up" pill
  right, on a `bg-white/80 backdrop-blur` bar with hairline bottom border.
- **App sidebar:** white panel, fixed 16rem; active item = `bg-sage-50
  text-sage-700 ring-sage-100`; inactive hover = soft sage tint;
  `aria-current="page"` on the active link.

---

## 6. Backgrounds & Texture

- **Page:** flat `#fafbfb`.
- **Hero / auth / marketing:** `.dot-grid-bg` — a low-opacity (6%) radial-dot
  grid (`22px` cells) over `#fafbfb`, echoing the ConnectGRC landing.
- **Cards/nav:** clean white to float above the dotted canvas.

---

## 7. Elevation & Borders

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | very soft 2-layer | resting cards |
| `shadow-card-hover` | slightly lifted | hovered marketing cards, auth card |
| Border | `#eceeed` 1px | card/section/nav hairlines |
| Radius | `rounded-lg` (controls) · `rounded-2xl` (cards) · `rounded-full` (pills/avatars/circle buttons) | |

---

## 8. Accessibility

- Text greens are sage-700/800 (AA on white); fills use sage-600 with white
  labels (AA).
- All interactive elements expose `focus-visible:outline-2
  outline-offset-2 outline-sage-500/600`.
- Skip-to-content link in the app shell; `aria-current="page"` on active nav.
- Form inputs keep visible borders, labels, and `role="alert"` errors.
- Status conveyed by **text + tone**, never color alone (badges carry labels).

---

## 9. Tailwind Token Map

| Design concept | Tailwind token |
|----------------|----------------|
| Primary green | `sage-600` (`brand-600` alias) |
| Hover / link green | `sage-700` |
| Tint surfaces | `sage-50`, `sage-100` |
| Display font | `font-display` (`--font-poppins`) |
| Body font | `font-sans` (`--font-inter`) |
| Page bg | `bg-[#fafbfb]` |
| Card border | `border-[#eceeed]` |
| Card shadow | `shadow-card`, `shadow-card-hover` |
| Dotted hero bg | `.dot-grid-bg` / `bg-dot-grid bg-dot-grid` |
| Primary button | `.btn-primary` |
| Secondary pill button | `.btn-secondary` |
| Circle icon button | `.btn-icon-circle` |
| Pill / category label | `.pill` |
| Card container | `.card` |

---

_Last updated: re-skin to Sage Enterprise. Palette sourced from the ConnectGRC
live site; functionality, routes, and API integration unchanged._
