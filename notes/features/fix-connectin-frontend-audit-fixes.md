# Fix ConnectIn Frontend Audit Issues

## Tasks
1. Fix primary-600 color contrast to meet WCAG AA (4.5:1 minimum)
2. Harden CSP in next.config.ts (remove unsafe-inline from script-src)
3. Add CSRF token integration to the API client
4. Create BottomNav mobile navigation component

## Key Files
- `products/connectin/apps/web/src/app/globals.css` (Task 1)
- `products/connectin/apps/web/next.config.ts` (Task 2)
- `products/connectin/apps/web/src/lib/api.ts` (Task 3)
- `products/connectin/apps/web/src/components/layout/BottomNav.tsx` (Task 4)
- `products/connectin/apps/web/src/app/(main)/layout.tsx` (Task 4 integration)

## Notes
- Backend CSRF uses @fastify/csrf-protection with @fastify/cookie session plugin
- The double-submit cookie pattern: backend sets a signed httpOnly CSRF cookie,
  frontend must call `fastify.generateCsrf()` endpoint to get a token, then
  send it back as `x-csrf-token` header
- Sidebar has 6 nav items: Home, Network, Jobs, Messages, Saved, Settings
- BottomNav should only show core items (Home, Network, Jobs, Messages, Profile)
- Next.js 16 requires unsafe-inline for styles but NOT for scripts in App Router
