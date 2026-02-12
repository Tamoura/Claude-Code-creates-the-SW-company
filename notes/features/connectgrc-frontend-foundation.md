# ConnectGRC Frontend Foundation

## Task: FRONTEND-01
## Branch: foundation/connectgrc
## Product: connectgrc

## Summary
Set up the frontend foundation for ConnectGRC - a GRC-native talent
platform. This is the scaffolding for the Next.js 14+ frontend.

## Key Decisions
- Port 3110 (frontend), API at 5006
- Reusing token-manager and api-client patterns from stablecoin-gateway
- Professional blue/teal color palette (#1e3a5f primary, #2196f3 accent, #00897b secondary)
- Route groups: (public), (auth), (app), (admin)
- Zustand for client-side state, Zod for validation
- Mobile-first responsive design (320px to 1440px)

## Components to Reuse
- TokenManager from stablecoin-gateway (direct copy)
- ApiClient base pattern from stablecoin-gateway (adapted, no mock, no product-specific methods)
- useAuth hook from stablecoin-gateway (adapted for Next.js)
- ErrorBoundary pattern from stablecoin-gateway (adapted for Next.js error.tsx)

## Files Created
- package.json, tsconfig.json, tailwind.config.ts, next.config.js
- .gitignore, .env.example
- Root layout, not-found, error pages
- Public pages: landing, about, pricing, for-talents, for-employers, how-it-works, resources, contact, terms
- Auth pages: login, register, verify-email, forgot-password, reset-password
- App pages: dashboard, profile, assessment, career, resources, notifications
- Admin pages: admin dashboard, users, frameworks, questions, analytics
- Shared components: Header, Footer, Sidebar, Button, Input, Card
- Libraries: api-client, token-manager
- Hooks: useAuth
- Test setup and component tests

## Status: In Progress
