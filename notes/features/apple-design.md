# ConnectIn: Apple-Inspired Design Overhaul

## Branch
`feature/connectin/apple-design` from `fix/connectin/audit-remediation`

## Phases
1. Design System Foundation (globals.css) — tokens, keyframes, utilities
2. Layout Chrome — TopBar, Sidebar, BottomNav glass + pill treatment
3. Auth Pages — gradient bg, glass cards, filled inputs, pill buttons
4. Landing Page — hero typography, glass header, card lift
5. Main App Pages — universal card upgrade, filled inputs
6. Animations & Polish — shimmer skeleton, staggered entry, focus-visible

## Key Constraints
- All 333 tests must pass without modification
- No new npm dependencies
- Preserve RTL, i18n, dark mode, accessibility
- Tests assert on text/roles/ARIA, never CSS classes

## Files (17)
globals.css, TopBar, Sidebar, BottomNav, auth layout, login, register,
forgot-password, landing page, feed, profile, network, jobs, messages,
settings, saved, LoadingSkeleton, main layout
