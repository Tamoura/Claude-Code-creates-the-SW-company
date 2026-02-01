# InvoiceForge MVP Remaining Features

## Branch: feature/invoiceforge/mvp-remaining

## Features Implemented
1. PDF Export - @react-pdf/renderer, lazy-loaded, injectable for tests
2. Stripe Payment Integration - plugin, payment links, Connect OAuth, webhooks
3. Public Invoice View - unauthenticated share token access
4. User Profile Module - replaced 501 stubs with real service

## Architecture Decisions
- PDF uses React.createElement directly in .ts (no JSX/tsx needed)
- PDF module lazy-imported via dynamic import() to avoid ESM issues in Jest
- Fake PDF generator injected in tests (setPdfGenerator pattern matches setAnthropicClient)
- Stripe plugin only registers when key is configured and not sk_test_fake
- Webhook routes registered in public context (no auth hook)
- Public invoice route registered outside auth-protected context
- All money values in cents (integers)
- Tax rate in basis points (850 = 8.5%)

## Test Summary
- Original: 60 tests
- Users: 11 tests (profile CRUD, subscription, no password leak)
- PDF: 4 tests (generation, 404, auth, filename)
- Public Invoice: 5 tests (share token, no sensitive data, no auth)
- Webhooks/Stripe: 11 tests (endpoint, signature, payment marking, connect)
- Total: 91 tests passing

## New Endpoints
- GET /api/users/me -- user profile
- PUT /api/users/me -- update name/businessName
- GET /api/users/me/subscription -- tier info
- GET /api/users/me/stripe/connect -- Stripe Connect OAuth URL
- POST /api/users/me/stripe/callback -- handle OAuth code
- GET /api/invoices/:id/pdf -- download PDF
- POST /api/invoices/:id/payment-link -- create Stripe checkout
- GET /api/invoices/public/:token -- public invoice view
- POST /api/webhooks/stripe -- Stripe webhook handler
