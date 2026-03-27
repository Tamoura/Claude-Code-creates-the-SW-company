# Design Review & Design System Protocol

**Version**: 1.0.0
**Created**: 2026-03-27
**Inspired by**: gstack `/design-consultation`, `/design-review`, `/plan-design-review`
**Applies to**: UI/UX Designer, Frontend Engineer, Code Reviewer

---

## Purpose

Provide structured design quality assessment through automated visual audits, design system generation, and design scoring. Bridges the gap between "it works" and "it's excellent."

## Part 1: Design System Generation

### When to Apply
- New product creation (after Architecture checkpoint)
- Major UI redesign or rebrand
- First frontend implementation of any product

### Process

The UI/UX Designer generates a complete design system covering 6 dimensions:

#### 1. Typography Scale
```
Font Family: [Primary], [Secondary], [Monospace]
Scale: 12px / 14px / 16px / 18px / 20px / 24px / 30px / 36px / 48px / 60px
Line Heights: 1.2 (headings), 1.5 (body), 1.6 (reading)
Font Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
Letter Spacing: -0.02em (headings), 0 (body), 0.05em (caps)
```

#### 2. Color System
```
Primary:    [50-950 scale, 10 shades]
Secondary:  [50-950 scale, 10 shades]
Neutral:    [50-950 scale, 10 shades]
Success:    [50-950 scale]
Warning:    [50-950 scale]
Error:      [50-950 scale]
Info:       [50-950 scale]

Contrast Ratios (WCAG AA minimum):
- Normal text: 4.5:1
- Large text: 3:1
- UI components: 3:1
```

#### 3. Spacing Scale
```
Base unit: 4px
Scale: 0 / 1 / 2 / 3 / 4 / 5 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
Maps to: 0 / 4px / 8px / 12px / 16px / 20px / 24px / 32px / 40px / 48px / 64px / 80px / 96px / 128px / 160px / 192px / 256px
```

#### 4. Component Tokens
```
Border Radius: sm (4px) / md (8px) / lg (12px) / xl (16px) / full
Shadow: sm / md / lg / xl (elevation scale)
Transition: fast (150ms) / normal (250ms) / slow (350ms)
Z-Index: dropdown (1000) / sticky (1100) / modal (1200) / popover (1300) / toast (1400)
```

#### 5. Responsive Breakpoints
```
sm:  640px   (mobile landscape)
md:  768px   (tablet portrait)
lg:  1024px  (tablet landscape / small desktop)
xl:  1280px  (desktop)
2xl: 1536px  (large desktop)
```

#### 6. Motion & Animation
```
Easing: ease-out (entrances), ease-in (exits), ease-in-out (state changes)
Duration: 150ms (micro), 250ms (small), 350ms (medium), 500ms (large)
Reduce-motion: All animations respect prefers-reduced-motion
```

### Output
Design system saved to `$PRODUCT_DIR/docs/design-system.md` with Tailwind config mappings.

---

## Part 2: Design Quality Scoring

### When to Apply
- During `/plan-design-review` equivalent
- Before CEO checkpoint for any product with a frontend
- When reviewing PRDs that include UI changes

### Scoring Dimensions (0-10 each)

| # | Dimension | What "10" Looks Like |
|---|-----------|---------------------|
| 1 | **Visual Hierarchy** | Eye naturally flows to the most important element; clear F/Z reading pattern |
| 2 | **Consistency** | Every similar element looks and behaves identically; no one-offs |
| 3 | **Whitespace** | Generous, intentional spacing; content breathes; no cramming |
| 4 | **Typography** | Limited typefaces, clear scale, readable line lengths (45-75 chars) |
| 5 | **Color Usage** | Purposeful palette; contrast ratios met; color not sole information carrier |
| 6 | **Interaction Design** | Obvious affordances; clear feedback; undo available; no dead ends |
| 7 | **Responsiveness** | Graceful at all breakpoints; touch targets >= 44px; no horizontal scroll |
| 8 | **Accessibility** | WCAG AA, keyboard-navigable, screen-reader friendly, focus visible |
| 9 | **Loading States** | Skeleton screens, progress indicators, optimistic updates; no blank flashes |
| 10 | **Delight** | Micro-interactions, smooth transitions, personality; feels crafted |

### Scoring Rules
- Score < 6 on any dimension = **FAIL** (must fix before proceeding)
- Average score < 7 = **CONDITIONAL PASS** (document accepted risks)
- Average score >= 8 = **PASS**

### Output Format
```markdown
## Design Review: [Product] — [Feature/Page]

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Hierarchy | 8 | Strong CTA placement, secondary actions appropriately muted |
| Consistency | 7 | Button styles consistent, but card padding varies |
| ... | ... | ... |

**Average**: X.X / 10
**Verdict**: PASS / CONDITIONAL PASS / FAIL
**Top 3 improvements**: [ranked by impact]
```

---

## Part 3: 80-Item Visual Audit Checklist

### When to Apply
- Before Production Gate for any product with a frontend
- As part of Browser-First Gate (uses browser automation protocol)
- On design review requests

### The Checklist

Uses browser automation (`browse:screenshot`, `browse:accessibility`) for evidence.

#### Layout & Structure (10 items)
- [ ] Page has clear visual hierarchy with single primary CTA
- [ ] Content width doesn't exceed readable line length (45-75 chars for body)
- [ ] Grid alignment is consistent (no misaligned elements)
- [ ] Adequate whitespace between sections (minimum 24px)
- [ ] Footer doesn't float mid-page on short content
- [ ] No orphaned headings (heading without following content)
- [ ] Sidebar navigation doesn't overlap main content
- [ ] Modal/dialog backgrounds dim the content behind
- [ ] Empty states have helpful messaging and actions
- [ ] Error pages (404, 500) are styled and helpful

#### Typography (10 items)
- [ ] No more than 2 font families used
- [ ] Heading hierarchy is logical (h1 > h2 > h3, no skips)
- [ ] Body text is 16px minimum on desktop, 14px minimum on mobile
- [ ] Line height is >= 1.4 for body text
- [ ] No lines of text wider than 75 characters
- [ ] Text contrast meets WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Links are visually distinct from surrounding text
- [ ] No text over images without sufficient contrast overlay
- [ ] Truncation uses ellipsis and has tooltip for full text
- [ ] Numbers in tables are right-aligned or monospaced

#### Color & Contrast (10 items)
- [ ] Primary action color used consistently and sparingly
- [ ] Destructive actions use red/danger color
- [ ] Success/error/warning states use distinct, conventional colors
- [ ] Color is never the sole indicator of state (icon/text accompanies)
- [ ] Background-to-text contrast >= 4.5:1 everywhere
- [ ] Focus indicators have >= 3:1 contrast against background
- [ ] Hover states are visible but not jarring
- [ ] Dark mode (if applicable) has proper contrast ratios
- [ ] Disabled states are visually distinct but not invisible
- [ ] Brand colors are used consistently with design system

#### Interactive Elements (10 items)
- [ ] All buttons have visible hover and active states
- [ ] Touch targets are >= 44x44px on mobile
- [ ] Form inputs have visible focus rings
- [ ] Dropdown menus are keyboard-accessible
- [ ] Loading buttons show spinner and disable re-click
- [ ] Links have underline or other non-color indicator
- [ ] Radio/checkbox groups have clear selection states
- [ ] Sliders/toggles have clear on/off states
- [ ] Pagination/infinite scroll provides clear position indicator
- [ ] Delete/destructive actions require confirmation

#### Forms & Input (10 items)
- [ ] All inputs have visible labels (not just placeholders)
- [ ] Required fields are marked (asterisk or explicit text)
- [ ] Validation errors appear inline next to the field
- [ ] Error messages are specific ("Email must contain @" not "Invalid")
- [ ] Success feedback appears after form submission
- [ ] Tab order follows visual layout
- [ ] Autofill is not blocked unnecessarily
- [ ] Date/time inputs use appropriate picker widgets
- [ ] File upload shows selected filename and size
- [ ] Multi-step forms show progress indicator

#### Responsive Design (10 items)
- [ ] No horizontal scrollbar at any standard breakpoint
- [ ] Navigation collapses to hamburger/drawer on mobile
- [ ] Images scale properly (no stretch, no overflow)
- [ ] Tables scroll horizontally or reflow on mobile
- [ ] Modals are usable on mobile (not off-screen)
- [ ] Touch gestures don't conflict with browser gestures
- [ ] Font sizes are readable without zooming on mobile
- [ ] Cards/grids reflow appropriately at breakpoints
- [ ] Hero sections scale without text becoming tiny/huge
- [ ] Fixed/sticky elements don't consume too much mobile viewport

#### Accessibility (10 items)
- [ ] All images have alt text (decorative images have alt="")
- [ ] Page has exactly one h1
- [ ] Skip-to-content link is present
- [ ] ARIA labels on icon-only buttons
- [ ] Form inputs are associated with labels via `for`/`id`
- [ ] Keyboard focus is visible on all interactive elements
- [ ] Modal traps focus within dialog
- [ ] Live regions announce dynamic content changes
- [ ] Color contrast passes WCAG AA on all text
- [ ] Page is navigable with keyboard alone (no mouse required)

#### Performance & Loading (10 items)
- [ ] Above-the-fold content renders within 1.5s (LCP)
- [ ] No layout shifts after initial paint (CLS < 0.1)
- [ ] Images are lazy-loaded below the fold
- [ ] Skeleton screens shown during data fetching
- [ ] No flash of unstyled content (FOUC)
- [ ] Spinner/progress shown for operations > 1 second
- [ ] Optimistic UI updates for common actions
- [ ] Critical CSS is inlined or preloaded
- [ ] No blocking scripts in document head
- [ ] Large lists use virtualization (> 100 items)

### Audit Execution

```bash
# For each main route:
browse:navigate http://localhost:$FRONTEND_PORT/[route]
browse:screenshot --name "[route]-desktop"
browse:accessibility > audit/[route]-a11y.json

# Responsive checks:
browse:evaluate "window.resizeTo(375, 812)"  # iPhone
browse:screenshot --name "[route]-mobile"
browse:evaluate "window.resizeTo(768, 1024)"  # iPad
browse:screenshot --name "[route]-tablet"
browse:evaluate "window.resizeTo(1280, 800)"  # Desktop
```

### Output
Audit results saved to `$PRODUCT_DIR/docs/design-audit.md` with screenshots referenced inline.

---

## Enforcement

| Gate | Requirement |
|------|------------|
| Browser-First Gate | 80-item audit must score >= 70/80 items passing |
| Production Gate | Design scoring average >= 7/10 |
| CEO Checkpoint | Design audit report included in deliverables |

## Cross-References
- Browser Automation Protocol: `.claude/protocols/browser-automation.md`
- Quality Verification: `.claude/protocols/quality-verification.md`
- Clean Code Protocol: `.claude/protocols/clean-code.md`
- Constitution Article X: Quality Gates
- Constitution Article IX: Diagram-First Documentation
