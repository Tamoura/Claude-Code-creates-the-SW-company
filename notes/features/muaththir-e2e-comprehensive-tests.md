# Muaththir E2E Comprehensive Tests

## Overview
Enhance the existing Playwright e2e test suite for Muaththir (child development tracker)
with comprehensive coverage of all critical user flows.

## Key Architecture Findings
- Frontend: Next.js 14 at port 3108, uses next-intl for i18n (en/ar)
- Backend: Fastify at port 5005
- Auth: Token stored in-memory only (TokenManager) - not localStorage
- Dashboard auth check: DashboardLayout checks TokenManager.hasToken() and redirects to /login
- Language: LanguageSwitcher toggles locale via server action (setLocale)
- RTL: html dir attribute set by RootLayout based on locale

## Test Files Created
1. `public-pages.spec.ts` - Landing, About, Pricing, Privacy, Terms pages
2. `auth-flow.spec.ts` - Login, Signup, Forgot Password, form validation
3. `dashboard.spec.ts` - Dashboard with mocked API, auth guard, radar chart
4. `observation-flow.spec.ts` - Create observation with mocked API
5. `milestones-flow.spec.ts` - View and toggle milestones
6. `i18n-flow.spec.ts` - Language switching, RTL/LTR verification

## Testing Strategy
- Public pages: Direct navigation, no mocking needed
- Auth pages: Form rendering and validation (no real backend needed)
- Dashboard/Observe/Milestones: Use Playwright route mocking for all API calls
- Auth state: Inject token via page.evaluate() on TokenManager
- i18n: Use cookie-based locale persistence (NEXT_LOCALE cookie)
